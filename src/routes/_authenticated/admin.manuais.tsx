import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Cloud,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDistanceToNow,
  isValid,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  deleteManual,
  listAdminManuals,
  listSyncJobs,
  processNextDriveBatch,
  syncDriveFolder,
} from "@/lib/admin";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SyncJob = {
  id: string;
  folder_id: string;
  folder_name: string | null;
  started_by: string | null;
  status: string;
  files_seen: number;
  files_imported: number;
  files_updated: number;
  files_skipped: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

type SyncProgress = {
  jobId: string | null;
  currentFolder: string | null;
  remainingFolders: number | null;
  filesSeen: number;
  filesImported: number;
  filesUpdated: number;
  filesSkipped: number;
};

type ManualBrand = {
  id?: string;
  name: string;
  slug?: string;
};

type ManualModel = {
  id?: string;
  name: string;
  slug?: string;
  brand_id?: string;
  brands:
    | ManualBrand
    | ManualBrand[]
    | null;
};

type AdminManual = {
  id: string;
  title: string;
  manual_type: string;
  last_updated: string | null;
  models:
    | ManualModel
    | ManualModel[]
    | null;
};

export const Route = createFileRoute(
  "/_authenticated/admin/manuais",
)({
  component: AdminManuais,

  errorComponent: ({ error }) => (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

        <div>
          <h2 className="text-sm font-semibold text-destructive">
            Erro ao carregar a página de manuais
          </h2>

          <p className="mt-1 break-words text-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
      </div>
    </div>
  ),

  notFoundComponent: () => (
    <div className="text-sm text-muted-foreground">
      Página não encontrada.
    </div>
  ),
});

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function formatRelativeDate(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (!isValid(date)) {
    return "—";
  }

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: ptBR,
  });
}

function getManualModel(
  manual: AdminManual,
): ManualModel | null {
  if (!manual.models) {
    return null;
  }

  if (Array.isArray(manual.models)) {
    return manual.models[0] ?? null;
  }

  return manual.models;
}

function getModelBrand(
  model: ManualModel | null,
): ManualBrand | null {
  if (!model?.brands) {
    return null;
  }

  if (Array.isArray(model.brands)) {
    return model.brands[0] ?? null;
  }

  return model.brands;
}

function formatManualType(
  value: string,
): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatSyncStatus(
  status: string,
): string {
  const labels: Record<string, string> = {
    running: "Em andamento",
    success: "Concluído",
    error: "Erro",
  };

  return labels[status] ?? status;
}

function AdminManuais() {
  const queryClient =
    useQueryClient();

  const listManuals =
    useServerFn(listAdminManuals);

  const listJobs =
    useServerFn(listSyncJobs);

  const synchronizeFolder =
    useServerFn(syncDriveFolder);

  const processBatch =
    useServerFn(processNextDriveBatch);

  const removeManual =
    useServerFn(deleteManual);

  const [search, setSearch] =
    useState("");

  const [folderId, setFolderId] =
    useState("");

  const [
    activeJobId,
    setActiveJobId,
  ] = useState<string | null>(
    null,
  );

  const [
    processingQueue,
    setProcessingQueue,
  ] = useState(false);

  const [
    syncProgress,
    setSyncProgress,
  ] = useState<SyncProgress>({
    jobId: null,
    currentFolder: null,
    remainingFolders: null,
    filesSeen: 0,
    filesImported: 0,
    filesUpdated: 0,
    filesSkipped: 0,
  });

  const manualsQuery = useQuery({
    queryKey: [
      "admin",
      "manuals",
      search.trim(),
    ],

    queryFn: async () => {
      const result = await listManuals({
        data: {
          q:
            search.trim() ||
            undefined,
        },
      });

      return result as AdminManual[];
    },

    staleTime: 15_000,

    retry: 1,

    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  });

  const jobsQuery = useQuery({
    queryKey: [
      "admin",
      "sync-jobs",
    ],

    queryFn: async () => {
      const result =
        await listJobs();

      return result as SyncJob[];
    },

    staleTime: 10_000,

    retry: 1,

    refetchOnWindowFocus: true,
    refetchInterval: 5_000,
  });

  const syncMutation =
    useMutation({
      mutationFn: async (
        selectedFolderId: string,
      ) => {
        setSyncProgress({
          jobId: null,
          currentFolder: null,
          remainingFolders: null,
          filesSeen: 0,
          filesImported: 0,
          filesUpdated: 0,
          filesSkipped: 0,
        });

        const result =
          await synchronizeFolder({
            data: {
              folderId:
                selectedFolderId,
            },
          });

        const jobId =
          result.job?.id;

        if (!jobId) {
          throw new Error(
            "A sincronização não retornou o ID do processo.",
          );
        }

        return result;
      },

      onSuccess: async (
        result,
      ) => {
        const jobId =
          result.job?.id;

        if (!jobId) {
          toast.error(
            "A fila foi criada, mas o processo não retornou um ID.",
          );

          return;
        }

        setActiveJobId(
          jobId,
        );

        setSyncProgress({
          jobId,
          currentFolder: null,
          remainingFolders:
            result.queueCreated ??
            result.brandsCreated ??
            null,
          filesSeen: 0,
          filesImported: 0,
          filesUpdated: 0,
          filesSkipped: 0,
        });

        setFolderId("");

        toast.success(
          `Fila criada com ${result.queueCreated ?? result.brandsCreated ?? 0} montadora(s). A sincronização começou e seguirá automaticamente enquanto esta página permanecer aberta.`,
        );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "sync-jobs",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "overview",
            ],
          }),
        ]);

        void runSyncLoop(
          jobId,
        );
      },

      onError: (error) => {
        console.error(
          "[AdminManuais] Erro ao iniciar sincronização:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Falha ao iniciar a sincronização do Google Drive",
          ),
        );
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn: (
        manualId: string,
      ) =>
        removeManual({
          data: {
            manualId,
          },
        }),

      onSuccess: async () => {
        toast.success(
          "Manual removido com sucesso",
        );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "manuals",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "overview",
            ],
          }),
        ]);
      },

      onError: (error) => {
        console.error(
          "[AdminManuais] Erro ao remover manual:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Erro ao remover manual",
          ),
        );
      },
    });

  const manuals =
    manualsQuery.data ?? [];

  const syncJobs =
    jobsQuery.data ?? [];

  useEffect(() => {
    const runningJob =
      syncJobs.find(
        (job) =>
          job.status ===
          "running",
      );

    if (
      runningJob &&
      !activeJobId
    ) {
      setActiveJobId(
        runningJob.id,
      );

      setSyncProgress({
        jobId:
          runningJob.id,
        currentFolder:
          null,
        remainingFolders:
          null,
        filesSeen:
          runningJob.files_seen ??
          0,
        filesImported:
          runningJob.files_imported ??
          0,
        filesUpdated:
          runningJob.files_updated ??
          0,
        filesSkipped:
          runningJob.files_skipped ??
          0,
      });
    }

    if (
      !runningJob &&
      activeJobId
    ) {
      const activeJob =
        syncJobs.find(
          (job) =>
            job.id ===
            activeJobId,
        );

      if (
        activeJob &&
        activeJob.status !==
          "running"
      ) {
        setActiveJobId(
          null,
        );
      }
    }
  }, [
    syncJobs,
    activeJobId,
  ]);

  async function runSyncLoop(
    jobId: string,
  ) {
    if (
      processingQueue
    ) {
      return;
    }

    setProcessingQueue(
      true,
    );

    try {
      while (true) {
        const result =
          await processBatch({
            data: {
              jobId,
              batchSize:
                200,
            },
          });

        const currentJob =
          result.job;

        setSyncProgress({
          jobId,
          currentFolder:
            result.queueItem
              ?.folder_name ??
            null,
          remainingFolders:
            result.remainingFolders ??
            (result.completed
              ? 0
              : null),
          filesSeen:
            currentJob?.files_seen ??
            0,
          filesImported:
            currentJob?.files_imported ??
            0,
          filesUpdated:
            currentJob?.files_updated ??
            0,
          filesSkipped:
            currentJob?.files_skipped ??
            0,
        });

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "manuals",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "sync-jobs",
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              "admin",
              "overview",
            ],
          }),
        ]);

        const job =
          currentJob;

        if (
          result.completed
        ) {
          toast.success(
            job
              ? `Sincronização concluída — ${job.files_imported ?? 0} novos, ${job.files_updated ?? 0} atualizados e ${job.files_skipped ?? 0} ignorados.`
              : "Sincronização concluída.",
          );

          setActiveJobId(
            null,
          );

          setSyncProgress(
            (current) => ({
              ...current,
              currentFolder: null,
              remainingFolders: 0,
            }),
          );

          break;
        }

        /*
         * Libera o navegador rapidamente entre os lotes.
         * Se a página for fechada ou atualizada, o loop para,
         * mas o progresso já permanece salvo no Supabase.
         */
        await new Promise<void>(
          (resolve) => {
            window.setTimeout(
              resolve,
              150,
            );
          },
        );
      }
    } catch (error) {
      console.error(
        "[AdminManuais] Erro ao processar sincronização:",
        error,
      );

      toast.error(
        getErrorMessage(
          error,
          "A sincronização foi interrompida. Clique em Continuar sincronização para retomar.",
        ),
      );
    } finally {
      setProcessingQueue(
        false,
      );
    }
  }

  async function handleContinueSync() {
    if (
      !activeJobId ||
      processingQueue
    ) {
      return;
    }

    await runSyncLoop(
      activeJobId,
    );
  }

  function handleSync() {
    const normalizedFolderId =
      folderId.trim();

    if (!normalizedFolderId) {
      toast.error(
        "Informe o ID da pasta do Google Drive.",
      );

      return;
    }

    syncMutation.mutate(
      normalizedFolderId,
    );
  }

  function handleDelete(
    manual: AdminManual,
  ) {
    const confirmed =
      window.confirm(
        `Remover o manual "${manual.title}"?`,
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(
      manual.id,
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />

          <h2 className="text-sm font-medium">
            Sincronizar pasta do Google Drive
          </h2>
        </div>

        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Cole o ID ou o link da pasta raiz do Google Drive.
          O sistema cria todas as montadoras e sincroniza os manuais
          automaticamente enquanto esta página estiver aberta. Se você
          atualizar ou sair da página, o progresso fica salvo; ao voltar,
          clique uma vez em Continuar sincronização para retomar. Estrutura esperada:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            MANUAIS UNIDOS/HONDA/CG160.pdf
          </code>
          .
        </p>

        <div className="flex flex-col gap-2 lg:flex-row">
          <Input
            placeholder="ID ou link da pasta do Drive"
            value={folderId}
            onChange={(event) =>
              setFolderId(
                event.target.value,
              )
            }
            className="min-w-0 flex-1"
            disabled={
              syncMutation.isPending
            }
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={
                !folderId.trim() ||
                syncMutation.isPending ||
                processingQueue
              }
              onClick={handleSync}
              className="w-full sm:w-auto"
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparando fila...
                </>
              ) : (
                <>
                  <Cloud className="mr-2 h-4 w-4" />
                  Iniciar sincronização
                </>
              )}
            </Button>

          </div>
        </div>

        {syncMutation.isPending && (
  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
    <div className="flex items-center gap-2 text-sm font-medium">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />

      Processando sincronização
    </div>

    <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
      <div>
        <p className="text-muted-foreground">
          Montadora
        </p>

        <p className="mt-1 truncate font-medium">
          Preparando fila...
        </p>
      </div>

      <div>
        <p className="text-muted-foreground">
          Pendentes
        </p>

        <p className="mt-1 font-medium">
          {syncProgress.remainingFolders ?? "—"}
        </p>
      </div>

      <div>
        <p className="text-muted-foreground">
          Vistos
        </p>

        <p className="mt-1 font-medium">
          {syncProgress.filesSeen}
        </p>
      </div>

      <div>
        <p className="text-muted-foreground">
          Novos
        </p>

        <p className="mt-1 font-medium">
          {syncProgress.filesImported}
        </p>
      </div>

      <div>
        <p className="text-muted-foreground">
          Atualizados
        </p>

        <p className="mt-1 font-medium">
          {syncProgress.filesUpdated}
        </p>
      </div>

      <div>
        <p className="text-muted-foreground">
          Ignorados
        </p>

        <p className="mt-1 font-medium">
          {syncProgress.filesSkipped}
        </p>
      </div>
    </div>

    <p className="mt-3 text-[11px] text-muted-foreground">
      Identificando as montadoras e preparando a fila de arquivos.
      A importação começará automaticamente.
    </p>
  </div>
)}

        {(processingQueue ||
          activeJobId) &&
          !syncMutation.isPending && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {processingQueue ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-primary" />
                  )}

                  {processingQueue
                    ? "Processando sincronização"
                    : "Sincronização pausada"}
                </div>

                {!processingQueue &&
                  activeJobId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={
                        handleContinueSync
                      }
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Continuar sincronização
                    </Button>
                  )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <p className="text-muted-foreground">
                    Montadora
                  </p>

                  <p className="mt-1 truncate font-medium">
                    {syncProgress.currentFolder ??
                      (processingQueue
                        ? "Preparando lote..."
                        : "Aguardando retomada")}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    Pendentes
                  </p>

                  <p className="mt-1 font-medium">
                    {syncProgress.remainingFolders ??
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    Vistos
                  </p>

                  <p className="mt-1 font-medium">
                    {syncProgress.filesSeen}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    Novos
                  </p>

                  <p className="mt-1 font-medium">
                    {syncProgress.filesImported}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    Atualizados
                  </p>

                  <p className="mt-1 font-medium">
                    {syncProgress.filesUpdated}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    Ignorados
                  </p>

                  <p className="mt-1 font-medium">
                    {syncProgress.filesSkipped}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground">
                Enquanto esta página estiver aberta, a sincronização continua automaticamente. Se você sair ou atualizar, o progresso permanece salvo.
              </p>
            </div>
          )}
        {jobsQuery.isError && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {getErrorMessage(
              jobsQuery.error,
              "Erro ao carregar o histórico de sincronizações.",
            )}
          </div>
        )}

        <div className="mt-5 max-h-64 overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[650px] text-xs">
            <thead className="sticky top-0 bg-muted/90 text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left">
                  Início
                </th>

                <th className="px-3 py-2 text-left">
                  Status
                </th>

                <th className="px-3 py-2 text-left">
                  Vistos
                </th>

                <th className="px-3 py-2 text-left">
                  Novos
                </th>

                <th className="px-3 py-2 text-left">
                  Atualizados
                </th>

                <th className="px-3 py-2 text-left">
                  Ignorados
                </th>
              </tr>
            </thead>

            <tbody>
              {jobsQuery.isLoading &&
                Array.from({
                  length: 3,
                }).map(
                  (_, index) => (
                    <tr
                      key={index}
                      className="border-t border-border"
                    >
                      <td
                        colSpan={6}
                        className="px-3 py-3"
                      >
                        <div className="h-6 animate-pulse rounded-lg bg-muted" />
                      </td>
                    </tr>
                  ),
                )}

              {!jobsQuery.isLoading &&
                syncJobs.map(
                  (job) => (
                    <tr
                      key={job.id}
                      className={`border-t border-border ${
                        job.id ===
                        activeJobId
                          ? "bg-primary/5"
                          : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        {formatRelativeDate(
                          job.started_at,
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className={
                            job.status ===
                            "success"
                              ? "text-emerald-500"
                              : job.status ===
                                  "error"
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }
                        >
                          {formatSyncStatus(
                            job.status,
                          )}
                        </span>

                        {job.error_message && (
                          <div className="mt-1 max-w-xs text-[11px] text-destructive">
                            {
                              job.error_message
                            }
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        {job.files_seen}
                      </td>

                      <td className="px-3 py-2">
                        {
                          job.files_imported
                        }
                      </td>

                      <td className="px-3 py-2">
                        {
                          job.files_updated
                        }
                      </td>

                      <td className="px-3 py-2">
                        {
                          job.files_skipped
                        }
                      </td>
                    </tr>
                  ),
                )}

              {!jobsQuery.isLoading &&
                syncJobs.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      Nenhuma sincronização registrada.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium">
              Manuais
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {manuals.length} manual(is)
              encontrado(s).
            </p>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <Input
              placeholder="Buscar por título..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              className="flex-1 sm:w-72"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Atualizar manuais"
              disabled={
                manualsQuery.isFetching
              }
              onClick={() =>
                manualsQuery.refetch()
              }
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  manualsQuery.isFetching
                    ? "animate-spin"
                    : ""
                }`}
              />
            </Button>
          </div>
        </div>

        {manualsQuery.isError && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {getErrorMessage(
              manualsQuery.error,
              "Erro ao carregar manuais.",
            )}
          </div>
        )}

        <div className="overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">
                  Título
                </th>

                <th className="px-3 py-2 text-left">
                  Marca / Modelo
                </th>

                <th className="px-3 py-2 text-left">
                  Tipo
                </th>

                <th className="px-3 py-2 text-left">
                  Atualizado
                </th>

                <th className="px-3 py-2 text-right">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {manualsQuery.isLoading &&
                Array.from({
                  length: 5,
                }).map(
                  (_, index) => (
                    <tr
                      key={index}
                      className="border-t border-border"
                    >
                      <td
                        colSpan={5}
                        className="px-3 py-3"
                      >
                        <div className="h-8 animate-pulse rounded-lg bg-muted" />
                      </td>
                    </tr>
                  ),
                )}

              {!manualsQuery.isLoading &&
                manuals.map(
                  (manual) => {
                    const model =
                      getManualModel(
                        manual,
                      );

                    const brand =
                      getModelBrand(
                        model,
                      );

                    const isDeleting =
                      deleteMutation.isPending &&
                      deleteMutation
                        .variables ===
                        manual.id;

                    return (
                      <tr
                        key={manual.id}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-3 font-medium">
                          {manual.title}
                        </td>

                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {brand?.name ||
                            "Marca não informada"}{" "}
                          ·{" "}
                          {model?.name ||
                            "Modelo não informado"}
                        </td>

                        <td className="px-3 py-3 text-xs">
                          {formatManualType(
                            manual.manual_type,
                          )}
                        </td>

                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {formatRelativeDate(
                            manual.last_updated,
                          )}
                        </td>

                        <td className="px-3 py-3 text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={
                              isDeleting
                            }
                            aria-label={`Remover ${manual.title}`}
                            onClick={() =>
                              handleDelete(
                                manual,
                              )
                            }
                            className="text-destructive/80 hover:text-destructive"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  },
                )}

              {!manualsQuery.isLoading &&
                manuals.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      Nenhum manual cadastrado ainda. Execute uma sincronização do Google Drive acima.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}