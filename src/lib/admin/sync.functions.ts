import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  assertAdmin,
  getErrorMessage,
  requireSupabaseAuth,
  throwQueryError,
  type ManualType,
} from "./shared";

type DriveFileWithFolder = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  parentFolderId?: string;
  parentFolderName?: string;
  brandFolderName?: string;
  folderPath?: string[];
};

type DriveFolder = {
  id: string;
  name: string;
  mimeType: "application/vnd.google-apps.folder";
};

type SyncQueueStatus =
  | "pending"
  | "processing"
  | "success"
  | "error";

type SyncQueueRow = {
  id: string;
  sync_job_id: string;
  folder_id: string;
  folder_name: string;
  status: SyncQueueStatus;
  files_seen: number;
  files_imported: number;
  files_updated: number;
  files_skipped: number;
  next_page_token: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

const DRIVE_BATCH_SIZE = 200;

const SYNC_JOB_SELECT = `
  id,
  folder_id,
  folder_name,
  started_by,
  status,
  files_seen,
  files_imported,
  files_updated,
  files_skipped,
  error_message,
  started_at,
  finished_at
`;

const SYNC_QUEUE_SELECT = `
  id,
  sync_job_id,
  folder_id,
  folder_name,
  status,
  files_seen,
  files_imported,
  files_updated,
  files_skipped,
  next_page_token,
  error_message,
  started_at,
  finished_at,
  created_at
`;

/**
 * ETAPA 1
 *
 * Recebe o link da pasta principal, cria todas as montadoras e prepara
 * uma fila no Supabase. Nenhum manual é importado nesta etapa.
 */
export const syncDriveFolder = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator((input: { folderId: string }) =>
    z
      .object({
        folderId: z
          .string()
          .trim()
          .min(10, "ID da pasta inválido")
          .max(300, "ID da pasta muito longo"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const {
      getDriveFileMetadata,
      listDriveChildFolders,
      slugify,
    } = await import("@/lib/drive.server");

    const normalizedFolderId =
      extractDriveFolderId(data.folderId);

    if (!normalizedFolderId) {
      throw new Error(
        "Não foi possível identificar o ID da pasta.",
      );
    }

    const rootFolderMetadata =
      await getDriveFileMetadata(
        normalizedFolderId,
      );

    if (!rootFolderMetadata) {
      throw new Error(
        "A pasta principal do Google Drive não foi encontrada.",
      );
    }

    const rootFolderName =
      cleanFolderName(
        rootFolderMetadata.name ?? "",
      ) || "Biblioteca";

    const jobResult =
      await supabaseAdmin
        .from("sync_jobs")
        .insert({
          folder_id:
            normalizedFolderId,
          folder_name:
            rootFolderName,
          started_by:
            context.userId,
          status:
            "running",
          files_seen:
            0,
          files_imported:
            0,
          files_updated:
            0,
          files_skipped:
            0,
          error_message:
            null,
          finished_at:
            null,
        })
        .select(
          SYNC_JOB_SELECT,
        )
        .single();

    throwQueryError(
      jobResult.error,
      "Erro ao iniciar sincronização",
    );

    if (!jobResult.data) {
      throw new Error(
        "Não foi possível criar o processo de sincronização.",
      );
    }

    const jobId =
      jobResult.data.id;

    try {
      const folders =
        (await listDriveChildFolders(
          normalizedFolderId,
        )) as DriveFolder[];

      if (
        folders.length === 0
      ) {
        throw new Error(
          "Nenhuma pasta de montadora foi encontrada dentro da pasta principal.",
        );
      }

      const validFolders =
        folders
          .map((folder) => ({
            id:
              folder.id,
            name:
              cleanFolderName(
                folder.name,
              ),
          }))
          .filter(
            (folder) =>
              Boolean(
                folder.id &&
                  folder.name,
              ),
          );

      /*
       * Cria todas as montadoras antes de importar qualquer manual.
       */
      for (
        const folder of
        validFolders
      ) {
        const brandSlug =
          slugify(
            folder.name,
          );

        if (!brandSlug) {
          continue;
        }

        const brandUpsert =
          await supabaseAdmin
            .from("brands")
            .upsert(
              {
                slug:
                  brandSlug,
                name:
                  formatDisplayName(
                    folder.name,
                  ),
              },
              {
                onConflict:
                  "slug",
              },
            );

        throwQueryError(
          brandUpsert.error,
          `Erro ao criar montadora ${folder.name}`,
        );
      }

      /*
       * Remove itens antigos da fila deste mesmo job, se existirem.
       */
      const clearQueue =
        await supabaseAdmin
          .from("sync_queue")
          .delete()
          .eq(
            "sync_job_id",
            jobId,
          );

      throwQueryError(
        clearQueue.error,
        "Erro ao preparar fila de sincronização",
      );

      const queueRows =
        validFolders.map(
          (folder) => ({
            sync_job_id:
              jobId,
            folder_id:
              folder.id,
            folder_name:
              folder.name,
            status:
              "pending" as const,
            files_seen:
              0,
            files_imported:
              0,
            files_updated:
              0,
            files_skipped:
              0,
            next_page_token:
              null,
            error_message:
              null,
            started_at:
              null,
            finished_at:
              null,
          }),
        );

      const queueInsert =
        await supabaseAdmin
          .from("sync_queue")
          .insert(
            queueRows,
          );

      throwQueryError(
        queueInsert.error,
        "Erro ao criar fila das montadoras",
      );

      const updateJob =
        await supabaseAdmin
          .from("sync_jobs")
          .update({
            status:
              "running",
            files_seen:
              0,
            files_imported:
              0,
            files_updated:
              0,
            files_skipped:
              0,
            error_message:
              null,
            finished_at:
              null,
          })
          .eq(
            "id",
            jobId,
          )
          .select(
            SYNC_JOB_SELECT,
          )
          .single();

      throwQueryError(
        updateJob.error,
        "Erro ao atualizar sincronização",
      );

      return {
        ok:
          true,
        job:
          updateJob.data,
        brandsCreated:
          validFolders.length,
        queueCreated:
          validFolders.length,
        nextAction:
          "process_queue" as const,
      };
    } catch (
      error: unknown
    ) {
      const errorMessage =
        getErrorMessage(
          error,
        );

      await supabaseAdmin
        .from("sync_jobs")
        .update({
          status:
            "error",
          error_message:
            errorMessage.slice(
              0,
              2000,
            ),
          finished_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          jobId,
        );

      throw new Error(
        errorMessage,
      );
    }
  });

/**
 * ETAPA 2
 *
 * Processa apenas um lote de uma montadora por chamada.
 * O frontend deve chamar esta função repetidamente enquanto hasMore = true.
 */
export const processNextDriveBatch = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (
      input: {
        jobId: string;
        batchSize?: number;
      },
    ) =>
      z
        .object({
          jobId: z
            .string()
            .uuid(
              "ID da sincronização inválido",
            ),
          batchSize: z
            .number()
            .int()
            .min(10)
            .max(1000)
            .optional(),
        })
        .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }) => {
      await assertAdmin(
        context,
      );

      const {
        supabaseAdmin,
      } = await import(
        "@/integrations/supabase/client.server"
      );

      const {
        getDriveFileMetadata,
        listDriveFilesPage,
        parseDriveFilename,
        slugify,
      } = await import(
        "@/lib/drive.server"
      );

      const jobResult =
        await supabaseAdmin
          .from(
            "sync_jobs",
          )
          .select(
            SYNC_JOB_SELECT,
          )
          .eq(
            "id",
            data.jobId,
          )
          .maybeSingle();

      throwQueryError(
        jobResult.error,
        "Erro ao carregar sincronização",
      );

      if (!jobResult.data) {
        throw new Error(
          "Sincronização não encontrada.",
        );
      }

      if (
        jobResult.data.status ===
        "success"
      ) {
        return {
          ok:
            true,
          completed:
            true,
          hasMore:
            false,
          job:
            jobResult.data,
          queueItem:
            null,
        };
      }

      const rootFolderMetadata =
        await getDriveFileMetadata(
          jobResult.data.folder_id,
        );

      const rootFolderName =
        cleanFolderName(
          rootFolderMetadata?.name ??
            jobResult.data.folder_name ??
            "",
        );

      /*
       * Primeiro tenta continuar uma pasta em processamento.
       * Caso não exista, pega a próxima pendente.
       */
      let queueResult =
        await supabaseAdmin
          .from(
            "sync_queue",
          )
          .select(
            SYNC_QUEUE_SELECT,
          )
          .eq(
            "sync_job_id",
            data.jobId,
          )
          .eq(
            "status",
            "processing",
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            },
          )
          .limit(1)
          .maybeSingle();

      throwQueryError(
        queueResult.error,
        "Erro ao carregar fila em processamento",
      );

      if (
        !queueResult.data
      ) {
        queueResult =
          await supabaseAdmin
            .from(
              "sync_queue",
            )
            .select(
              SYNC_QUEUE_SELECT,
            )
            .eq(
              "sync_job_id",
              data.jobId,
            )
            .eq(
              "status",
              "pending",
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              },
            )
            .limit(1)
            .maybeSingle();

        throwQueryError(
          queueResult.error,
          "Erro ao carregar próxima montadora",
        );
      }

      if (
        !queueResult.data
      ) {
        const completedJob =
          await finalizeJob(
            supabaseAdmin,
            data.jobId,
          );

        return {
          ok:
            true,
          completed:
            true,
          hasMore:
            false,
          job:
            completedJob,
          queueItem:
            null,
        };
      }

      const queueItem =
        queueResult.data as SyncQueueRow;

      const now =
        new Date().toISOString();

      const markProcessing =
        await supabaseAdmin
          .from(
            "sync_queue",
          )
          .update({
            status:
              "processing",
            started_at:
              queueItem.started_at ??
              now,
            error_message:
              null,
          })
          .eq(
            "id",
            queueItem.id,
          );

      throwQueryError(
        markProcessing.error,
        `Erro ao iniciar montadora ${queueItem.folder_name}`,
      );

      let batchSeen =
        0;
      let batchImported =
        0;
      let batchUpdated =
        0;
      let batchSkipped =
        0;

      try {
        const page =
          await listDriveFilesPage(
            queueItem.folder_id,
            {
              folderName:
                queueItem.folder_name,
              rootFolderName,
              pageToken:
                queueItem.next_page_token,
              pageSize:
                data.batchSize ??
                DRIVE_BATCH_SIZE,
            },
          );

        const files =
          page.files as DriveFileWithFolder[];

        batchSeen =
          files.length;

        const brand =
          await ensureBrand(
            supabaseAdmin,
            queueItem.folder_name,
            slugify,
          );

        for (
          const file of
          files
        ) {
          try {
            const result =
              await importDriveFile({
                supabaseAdmin,
                file,
                brandId:
                  brand.id,
                brandName:
                  queueItem.folder_name,
                brandSlug:
                  brand.slug,
                parseDriveFilename,
                slugify,
              });

            if (
              result ===
              "imported"
            ) {
              batchImported +=
                1;
            } else if (
              result ===
              "updated"
            ) {
              batchUpdated +=
                1;
            } else {
              batchSkipped +=
                1;
            }
          } catch (
            fileError
          ) {
            batchSkipped +=
              1;

            console.error(
              "[processNextDriveBatch] Arquivo ignorado:",
              {
                fileId:
                  file.id,
                fileName:
                  file.name,
                error:
                  getErrorMessage(
                    fileError,
                  ),
              },
            );
          }
        }

        const hasNextPage =
          Boolean(
            page.nextPageToken,
          );

        const updatedQueueResult =
          await supabaseAdmin
            .from(
              "sync_queue",
            )
            .update({
              status:
                hasNextPage
                  ? "pending"
                  : "success",
              files_seen:
                queueItem.files_seen +
                batchSeen,
              files_imported:
                queueItem.files_imported +
                batchImported,
              files_updated:
                queueItem.files_updated +
                batchUpdated,
              files_skipped:
                queueItem.files_skipped +
                batchSkipped,
              next_page_token:
                page.nextPageToken,
              error_message:
                null,
              finished_at:
                hasNextPage
                  ? null
                  : new Date().toISOString(),
            })
            .eq(
              "id",
              queueItem.id,
            )
            .select(
              SYNC_QUEUE_SELECT,
            )
            .single();

        throwQueryError(
          updatedQueueResult.error,
          "Erro ao salvar progresso da montadora",
        );

        const job =
          await refreshJobTotals(
            supabaseAdmin,
            data.jobId,
          );

        const remainingResult =
          await supabaseAdmin
            .from(
              "sync_queue",
            )
            .select(
              "id",
              {
                count:
                  "exact",
                head:
                  true,
              },
            )
            .eq(
              "sync_job_id",
              data.jobId,
            )
            .in(
              "status",
              [
                "pending",
                "processing",
              ],
            );

        throwQueryError(
          remainingResult.error,
          "Erro ao verificar fila restante",
        );

        const remaining =
          remainingResult.count ??
          0;

        if (
          remaining === 0
        ) {
          const completedJob =
            await finalizeJob(
              supabaseAdmin,
              data.jobId,
            );

          return {
            ok:
              true,
            completed:
              true,
            hasMore:
              false,
            job:
              completedJob,
            queueItem:
              updatedQueueResult.data,
            batch: {
              seen:
                batchSeen,
              imported:
                batchImported,
              updated:
                batchUpdated,
              skipped:
                batchSkipped,
            },
          };
        }

        return {
          ok:
            true,
          completed:
            false,
          hasMore:
            true,
          job,
          queueItem:
            updatedQueueResult.data,
          remainingFolders:
            remaining,
          batch: {
            seen:
              batchSeen,
            imported:
              batchImported,
            updated:
              batchUpdated,
            skipped:
              batchSkipped,
          },
        };
      } catch (
        error: unknown
      ) {
        const errorMessage =
          getErrorMessage(
            error,
          );

        await supabaseAdmin
          .from(
            "sync_queue",
          )
          .update({
            status:
              "error",
            error_message:
              errorMessage.slice(
                0,
                2000,
              ),
            finished_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            queueItem.id,
          );

        await refreshJobTotals(
          supabaseAdmin,
          data.jobId,
        );

        throw new Error(
          `Falha na montadora ${queueItem.folder_name}: ${errorMessage}`,
        );
      }
    },
  );

/**
 * Permite recolocar uma montadora com erro na fila.
 */
export const retryDriveQueueItem = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (
      input: {
        queueItemId: string;
      },
    ) =>
      z
        .object({
          queueItemId: z
            .string()
            .uuid(),
        })
        .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }) => {
      await assertAdmin(
        context,
      );

      const {
        supabaseAdmin,
      } = await import(
        "@/integrations/supabase/client.server"
      );

      const result =
        await supabaseAdmin
          .from(
            "sync_queue",
          )
          .update({
            status:
              "pending",
            error_message:
              null,
            finished_at:
              null,
          })
          .eq(
            "id",
            data.queueItemId,
          )
          .select(
            SYNC_QUEUE_SELECT,
          )
          .single();

      throwQueryError(
        result.error,
        "Erro ao reenfileirar montadora",
      );

      return {
        ok:
          true,
        queueItem:
          result.data,
      };
    },
  );

/**
 * Lista os processos gerais.
 */
export const listSyncJobs = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }) => {
      await assertAdmin(
        context,
      );

      const {
        supabaseAdmin,
      } = await import(
        "@/integrations/supabase/client.server"
      );

      const result =
        await supabaseAdmin
          .from(
            "sync_jobs",
          )
          .select(
            SYNC_JOB_SELECT,
          )
          .order(
            "started_at",
            {
              ascending:
                false,
            },
          )
          .limit(50);

      throwQueryError(
        result.error,
        "Erro ao listar sincronizações",
      );

      return (
        result.data ??
        []
      );
    },
  );

/**
 * Retorna o job e o progresso por montadora.
 */
export const getSyncJob = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (
      input: {
        jobId: string;
      },
    ) =>
      z
        .object({
          jobId: z
            .string()
            .uuid(
              "ID da sincronização inválido",
            ),
        })
        .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }) => {
      await assertAdmin(
        context,
      );

      const {
        supabaseAdmin,
      } = await import(
        "@/integrations/supabase/client.server"
      );

      const jobResult =
        await supabaseAdmin
          .from(
            "sync_jobs",
          )
          .select(
            SYNC_JOB_SELECT,
          )
          .eq(
            "id",
            data.jobId,
          )
          .maybeSingle();

      throwQueryError(
        jobResult.error,
        "Erro ao carregar sincronização",
      );

      if (
        !jobResult.data
      ) {
        throw new Error(
          "Sincronização não encontrada",
        );
      }

      const queueResult =
        await supabaseAdmin
          .from(
            "sync_queue",
          )
          .select(
            SYNC_QUEUE_SELECT,
          )
          .eq(
            "sync_job_id",
            data.jobId,
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            },
          );

      throwQueryError(
        queueResult.error,
        "Erro ao carregar fila da sincronização",
      );

      return {
        ...jobResult.data,
        queue:
          queueResult.data ??
          [],
      };
    },
  );

async function importDriveFile({
  supabaseAdmin,
  file,
  brandId,
  brandName,
  brandSlug,
  parseDriveFilename,
  slugify,
}: {
  supabaseAdmin: any;
  file: DriveFileWithFolder;
  brandId: string;
  brandName: string;
  brandSlug: string;
  parseDriveFilename: (
    filename: string,
  ) => {
    yearStart: number | null;
    yearEnd: number | null;
    manualType: string;
    format: string;
  } | null;
  slugify: (
    value: string,
  ) => string;
}): Promise<
  "imported" |
  "updated" |
  "skipped"
> {
  if (
    !file.name ||
    file.mimeType ===
      "application/vnd.google-apps.folder"
  ) {
    return "skipped";
  }

  const modelName =
    getModelNameFromFilename(
      file.name,
    );

  if (!modelName) {
    return "skipped";
  }

  const modelSlugPart =
    slugify(
      modelName,
    );

  if (!modelSlugPart) {
    return "skipped";
  }

  const parsed =
    parseDriveFilename(
      file.name,
    );

  const yearStart =
    parsed?.yearStart ??
    null;

  const yearEnd =
    parsed?.yearEnd ??
    parsed?.yearStart ??
    null;

  const modelSlug =
    `${brandSlug}-${modelSlugPart}`;

  const modelLookup =
    await supabaseAdmin
      .from(
        "models",
      )
      .select(
        "id",
      )
      .eq(
        "slug",
        modelSlug,
      )
      .maybeSingle();

  throwQueryError(
    modelLookup.error,
    `Erro ao localizar modelo ${modelName}`,
  );

  let modelId =
    modelLookup.data?.id ??
    null;

  if (!modelId) {
    const modelInsert =
      await supabaseAdmin
        .from(
          "models",
        )
        .insert({
          brand_id:
            brandId,
          slug:
            modelSlug,
          name:
            modelName,
          year_start:
            yearStart,
          year_end:
            yearEnd,
        })
        .select(
          "id",
        )
        .single();

    throwQueryError(
      modelInsert.error,
      `Erro ao criar modelo ${modelName}`,
    );

    modelId =
      modelInsert.data?.id ??
      null;
  } else if (
    yearStart !== null
  ) {
    const modelUpdate =
      await supabaseAdmin
        .from(
          "models",
        )
        .update({
          name:
            modelName,
          brand_id:
            brandId,
          year_start:
            yearStart,
          year_end:
            yearEnd,
        })
        .eq(
          "id",
          modelId,
        );

    throwQueryError(
      modelUpdate.error,
      `Erro ao atualizar modelo ${modelName}`,
    );
  }

  if (!modelId) {
    return "skipped";
  }

  const typeMap: Record<
    string,
    ManualType
  > = {
    service:
      "servico",
    owner:
      "proprietario",
    wiring:
      "esquema_eletrico",
    parts:
      "pecas",
    bulletin:
      "boletim",
  };

  const manualType: ManualType =
    parsed
      ? typeMap[
          parsed.manualType
        ] ??
        "outro"
      : detectManualTypeFromFilename(
          file.name,
        );

  const format =
    parsed?.format ??
    getFileExtension(
      file.name,
    ) ??
    "pdf";

  const yearRange =
    yearStart !== null
      ? yearEnd &&
        yearEnd !== yearStart
        ? `${yearStart}-${yearEnd}`
        : String(
            yearStart,
          )
      : "";

  const title = [
    formatDisplayName(
      brandName,
    ),
    modelName,
    yearRange,
    "—",
    getManualTypeLabel(
      manualType,
    ),
  ]
    .filter(Boolean)
    .join(" ");

  const existingManual =
    await supabaseAdmin
      .from(
        "manuals",
      )
      .select(
        "id",
      )
      .eq(
        "drive_file_id",
        file.id,
      )
      .maybeSingle();

  throwQueryError(
    existingManual.error,
    `Erro ao localizar manual ${file.name}`,
  );

  const tags = [
    formatDisplayName(
      brandName,
    ),
    modelName,
    yearStart !== null
      ? String(
          yearStart,
        )
      : null,
    manualType,
    file.parentFolderName ??
      brandName,
  ].filter(
    (
      value,
    ): value is string =>
      typeof value ===
        "string" &&
      value.trim().length >
        0,
  );

  const manualData = {
    model_id:
      modelId,
    title,
    manual_type:
      manualType,
    year:
      yearStart,
    language:
      "pt-BR",
    format,
    file_size_bytes:
      file.size &&
      Number.isFinite(
        Number(
          file.size,
        ),
      )
        ? Number(
            file.size,
          )
        : null,
    thumbnail_url:
      file.thumbnailLink ??
      null,
    drive_file_id:
      file.id,
    tags,
    last_updated:
      file.modifiedTime ??
      new Date().toISOString(),
    updated_at:
      new Date().toISOString(),
  };

  if (
    existingManual.data
  ) {
    const updateResult =
      await supabaseAdmin
        .from(
          "manuals",
        )
        .update(
          manualData,
        )
        .eq(
          "id",
          existingManual.data.id,
        );

    throwQueryError(
      updateResult.error,
      `Erro ao atualizar manual ${file.name}`,
    );

    return "updated";
  }

  const insertResult =
    await supabaseAdmin
      .from(
        "manuals",
      )
      .insert(
        manualData,
      );

  throwQueryError(
    insertResult.error,
    `Erro ao importar manual ${file.name}`,
  );

  return "imported";
}

async function ensureBrand(
  supabaseAdmin: any,
  brandName: string,
  slugify: (
    value: string,
  ) => string,
): Promise<{
  id: string;
  slug: string;
}> {
  const brandSlug =
    slugify(
      brandName,
    );

  if (!brandSlug) {
    throw new Error(
      `Slug inválido para a montadora ${brandName}.`,
    );
  }

  const lookup =
    await supabaseAdmin
      .from(
        "brands",
      )
      .select(
        "id, slug",
      )
      .eq(
        "slug",
        brandSlug,
      )
      .maybeSingle();

  throwQueryError(
    lookup.error,
    `Erro ao localizar montadora ${brandName}`,
  );

  if (
    lookup.data
  ) {
    return lookup.data;
  }

  const insert =
    await supabaseAdmin
      .from(
        "brands",
      )
      .insert({
        slug:
          brandSlug,
        name:
          formatDisplayName(
            brandName,
          ),
      })
      .select(
        "id, slug",
      )
      .single();

  throwQueryError(
    insert.error,
    `Erro ao criar montadora ${brandName}`,
  );

  if (!insert.data) {
    throw new Error(
      `A montadora ${brandName} não retornou um ID.`,
    );
  }

  return insert.data;
}

async function refreshJobTotals(
  supabaseAdmin: any,
  jobId: string,
) {
  const queueResult =
    await supabaseAdmin
      .from(
        "sync_queue",
      )
      .select(
        `
          status,
          files_seen,
          files_imported,
          files_updated,
          files_skipped
        `,
      )
      .eq(
        "sync_job_id",
        jobId,
      );

  throwQueryError(
    queueResult.error,
    "Erro ao calcular progresso",
  );

  const rows =
    queueResult.data ??
    [];

  const totals =
    rows.reduce(
      (
        accumulator: {
          seen: number;
          imported: number;
          updated: number;
          skipped: number;
        },
        row: any,
      ) => ({
        seen:
          accumulator.seen +
          Number(
            row.files_seen ??
              0,
          ),
        imported:
          accumulator.imported +
          Number(
            row.files_imported ??
              0,
          ),
        updated:
          accumulator.updated +
          Number(
            row.files_updated ??
              0,
          ),
        skipped:
          accumulator.skipped +
          Number(
            row.files_skipped ??
              0,
          ),
      }),
      {
        seen:
          0,
        imported:
          0,
        updated:
          0,
        skipped:
          0,
      },
    );

  const hasErrors =
    rows.some(
      (row: any) =>
        row.status ===
        "error",
    );

  const updateResult =
    await supabaseAdmin
      .from(
        "sync_jobs",
      )
      .update({
        status:
          hasErrors
            ? "error"
            : "running",
        files_seen:
          totals.seen,
        files_imported:
          totals.imported,
        files_updated:
          totals.updated,
        files_skipped:
          totals.skipped,
      })
      .eq(
        "id",
        jobId,
      )
      .select(
        SYNC_JOB_SELECT,
      )
      .single();

  throwQueryError(
    updateResult.error,
    "Erro ao atualizar totais da sincronização",
  );

  return updateResult.data;
}

async function finalizeJob(
  supabaseAdmin: any,
  jobId: string,
) {
  const queueResult =
    await supabaseAdmin
      .from(
        "sync_queue",
      )
      .select(
        `
          status,
          files_seen,
          files_imported,
          files_updated,
          files_skipped
        `,
      )
      .eq(
        "sync_job_id",
        jobId,
      );

  throwQueryError(
    queueResult.error,
    "Erro ao finalizar sincronização",
  );

  const rows =
    queueResult.data ??
    [];

  const totals =
    rows.reduce(
      (
        accumulator: {
          seen: number;
          imported: number;
          updated: number;
          skipped: number;
        },
        row: any,
      ) => ({
        seen:
          accumulator.seen +
          Number(
            row.files_seen ??
              0,
          ),
        imported:
          accumulator.imported +
          Number(
            row.files_imported ??
              0,
          ),
        updated:
          accumulator.updated +
          Number(
            row.files_updated ??
              0,
          ),
        skipped:
          accumulator.skipped +
          Number(
            row.files_skipped ??
              0,
          ),
      }),
      {
        seen:
          0,
        imported:
          0,
        updated:
          0,
        skipped:
          0,
      },
    );

  const hasErrors =
    rows.some(
      (row: any) =>
        row.status ===
        "error",
    );

  const result =
    await supabaseAdmin
      .from(
        "sync_jobs",
      )
      .update({
        status:
          hasErrors
            ? "error"
            : "success",
        files_seen:
          totals.seen,
        files_imported:
          totals.imported,
        files_updated:
          totals.updated,
        files_skipped:
          totals.skipped,
        error_message:
          hasErrors
            ? "Uma ou mais montadoras apresentaram erro."
            : null,
        finished_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        jobId,
      )
      .select(
        SYNC_JOB_SELECT,
      )
      .single();

  throwQueryError(
    result.error,
    "Erro ao concluir sincronização",
  );

  return result.data;
}

function getModelNameFromFilename(
  filename: string,
): string {
  const withoutExtension =
    filename.replace(
      /\.[^.]+$/,
      "",
    );

  return withoutExtension
    .replace(
      /[_]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function getFileExtension(
  filename: string,
): string | null {
  const match =
    filename.match(
      /\.([a-zA-Z0-9]+)$/,
    );

  return (
    match?.[1]
      ?.toLowerCase() ??
    null
  );
}

function detectManualTypeFromFilename(
  filename: string,
): ManualType {
  const normalized =
    normalizeText(
      filename,
    );

  if (
    normalized.includes(
      "esquema eletrico",
    ) ||
    normalized.includes(
      "diagrama eletrico",
    ) ||
    normalized.includes(
      "wiring",
    ) ||
    normalized.includes(
      "electrical",
    )
  ) {
    return "esquema_eletrico";
  }

  if (
    normalized.includes(
      "catalogo de pecas",
    ) ||
    normalized.includes(
      "catalogo pecas",
    ) ||
    normalized.includes(
      "parts catalog",
    ) ||
    normalized.includes(
      "part catalog",
    )
  ) {
    return "pecas";
  }

  if (
    normalized.includes(
      "proprietario",
    ) ||
    normalized.includes(
      "owner manual",
    ) ||
    normalized.includes(
      "manual do usuario",
    )
  ) {
    return "proprietario";
  }

  if (
    normalized.includes(
      "boletim",
    ) ||
    normalized.includes(
      "bulletin",
    ) ||
    normalized.includes(
      "recall",
    )
  ) {
    return "boletim";
  }

  if (
    normalized.includes(
      "servico",
    ) ||
    normalized.includes(
      "oficina",
    ) ||
    normalized.includes(
      "service manual",
    ) ||
    normalized.includes(
      "workshop",
    ) ||
    normalized.includes(
      "repair manual",
    )
  ) {
    return "servico";
  }

  return "outro";
}

function getManualTypeLabel(
  manualType: ManualType,
): string {
  switch (
    manualType
  ) {
    case "servico":
      return "manual de serviço";

    case "proprietario":
      return "manual do proprietário";

    case "esquema_eletrico":
      return "esquema elétrico";

    case "pecas":
      return "catálogo de peças";

    case "boletim":
      return "boletim técnico";

    default:
      return "manual";
  }
}

function formatDisplayName(
  value: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    return "";
  }

  if (
    /^[A-Z0-9& -]+$/.test(
      normalized,
    ) &&
    normalized.length <=
      24
  ) {
    return normalized;
  }

  return normalized
    .toLowerCase()
    .replace(
      /(^|\s|-)\p{L}/gu,
      (letter) =>
        letter.toUpperCase(),
    );
}

function cleanFolderName(
  value: string,
): string {
  return value
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function normalizeText(
  value: string,
): string {
  return value
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim();
}

function extractDriveFolderId(
  value: string,
): string {
  const trimmed =
    value.trim();

  if (
    !trimmed.includes(
      "drive.google.com",
    )
  ) {
    return trimmed;
  }

  try {
    const url =
      new URL(
        trimmed,
      );

    const queryId =
      url.searchParams.get(
        "id",
      );

    if (queryId) {
      return queryId.trim();
    }

    const folderMatch =
      url.pathname.match(
        /\/folders\/([^/?]+)/,
      );

    if (
      folderMatch?.[1]
    ) {
      return folderMatch[1];
    }

    const fileMatch =
      url.pathname.match(
        /\/d\/([^/?]+)/,
      );

    if (
      fileMatch?.[1]
    ) {
      return fileMatch[1];
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}