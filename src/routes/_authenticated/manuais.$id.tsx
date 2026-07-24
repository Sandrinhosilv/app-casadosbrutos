import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Download,
  FileText,
  Heart,
  ImageOff,
  Loader2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  getManual,
  getManualDownloadUrl,
  listMyFavorites,
  toggleFavorite as toggleFavoriteServerFn,
} from "@/lib/manuals.functions";

type DownloadFailureReason =
  | "no_subscription"
  | "inactive_subscription"
  | "expired_subscription"
  | "not_found"
  | "file_not_ready";

type DownloadResult =
  | {
      ok: false;
      reason: DownloadFailureReason;
    }
  | {
      ok: true;
      manual: {
        id: string;
        title: string;
      };
      url: string;
      expiresAt?: string;
    };

type FavoriteResult = {
  favorited: boolean;
};

type ManualThumbnailProps = {
  title: string;
  thumbnailUrl?: string | null;
  driveFileId?: string | null;
};

export const Route = createFileRoute(
  "/_authenticated/manuais/$id",
)({
  head: () => ({
    meta: [
      {
        title: "Manual — Manual Stock",
      },
    ],
  }),

  component: ManualDetail,
});

function ManualDetail() {
  const { id } =
    Route.useParams();

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const downloadLockedRef =
    useRef(false);

  const fetchManual =
    useServerFn(
      getManual,
    );

  const getDownloadUrl =
    useServerFn(
      getManualDownloadUrl,
    );

  const toggleFavoriteFn =
    useServerFn(
      toggleFavoriteServerFn,
    );

  const fetchFavorites =
    useServerFn(
      listMyFavorites,
    );

  const manualQuery =
    useQuery({
      queryKey: [
        "manual",
        id,
      ],

      queryFn: () =>
        fetchManual({
          data: {
            id,
          },
        }),

      retry: 1,

      refetchOnWindowFocus:
        false,
    });

  const favoritesQuery =
    useQuery({
      queryKey: [
        "favorites",
      ],

      queryFn: () =>
        fetchFavorites(),

      retry: 1,

      refetchOnWindowFocus:
        false,
    });

  const manual =
    manualQuery.data;

  const favorites =
    favoritesQuery.data ?? [];

  const isFavorite =
    favorites.some(
      (favorite: any) =>
        favorite.manuals?.id ===
        id,
    );

  const favoriteMutation =
    useMutation<
      FavoriteResult,
      Error,
      void
    >({
      mutationFn:
        async () => {
          const result =
            await toggleFavoriteFn({
              data: {
                manualId: id,
              },
            });

          return result as FavoriteResult;
        },

      onSuccess:
        async (result) => {
          toast.success(
            result.favorited
              ? "Manual adicionado aos favoritos."
              : "Manual removido dos favoritos.",
          );

          await queryClient.invalidateQueries({
            queryKey: [
              "favorites",
            ],
          });
        },

      onError:
        (error) => {
          console.error(
            "[ManualDetail] Erro ao favoritar:",
            error,
          );

          toast.error(
            getErrorMessage(
              error,
              "Não foi possível atualizar os favoritos.",
            ),
          );
        },
    });

  const downloadMutation =
    useMutation<
      DownloadResult,
      Error,
      void
    >({
      mutationFn:
        async () => {
          if (
            downloadLockedRef.current
          ) {
            throw new Error(
              "Download já está sendo processado.",
            );
          }

          downloadLockedRef.current =
            true;

          const result =
            await getDownloadUrl({
              data: {
                manualId: id,
              },
            });

          return result as DownloadResult;
        },

      onSuccess:
        async (result) => {
          if (!result.ok) {
            downloadLockedRef.current =
              false;

            handleDownloadFailure(
              result.reason,
              navigate,
            );

            return;
          }

          if (!result.url) {
            downloadLockedRef.current =
              false;

            toast.error(
              "Não foi possível gerar o link de download.",
            );

            return;
          }

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-overview",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "my-downloads",
              ],
            }),
          ]);

          window.location.assign(
            result.url,
          );
        },

      onError:
        (error) => {
          downloadLockedRef.current =
            false;

          console.error(
            "[ManualDetail] Erro ao liberar download:",
            error,
          );

          if (
            error.message ===
            "Download já está sendo processado."
          ) {
            return;
          }

          toast.error(
            getErrorMessage(
              error,
              "Não foi possível liberar o download.",
            ),
          );
        },

      onSettled:
        () => {
          window.setTimeout(
            () => {
              downloadLockedRef.current =
                false;
            },
            1500,
          );
        },
    });

  function handleDownloadClick() {
    if (
      downloadLockedRef.current ||
      downloadMutation.isPending
    ) {
      return;
    }

    downloadMutation.mutate();
  }

  if (
    manualQuery.isLoading
  ) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />

          Carregando manual...
        </div>
      </div>
    );
  }

  if (
    manualQuery.isError
  ) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <h1 className="text-sm font-semibold text-destructive">
            Não foi possível carregar o manual
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(
              manualQuery.error,
              "Ocorreu um erro inesperado.",
            )}
          </p>
        </div>
      </div>
    );
  }

  if (!manual) {
    throw notFound();
  }

  const model =
    normalizeRelation(
      manual.models,
    );

  const brand =
    normalizeRelation(
      model?.brands,
    );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {model && (
        <Link
          to="/modelos/$slug"
          params={{
            slug:
              model.slug,
          }}
          className="text-xs text-muted-foreground transition hover:text-foreground"
        >
          ←{" "}
          {brand?.name ??
            "Marca"}{" "}
          {model.name}
        </Link>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-3xl border border-border bg-card p-6">
          <ManualThumbnail
            title={manual.title}
            thumbnailUrl={
              manual.thumbnail_url
            }
            driveFileId={
              manual.drive_file_id
            }
          />

          <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
            {manual.format
              ?.toUpperCase() ??
              "PDF"}{" "}
            ·{" "}
            {manual.file_size_bytes
              ? formatBytes(
                  manual.file_size_bytes,
                )
              : "—"}
          </p>
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {manual.title}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {brand?.name ??
              "Marca não informada"}{" "}
            ·{" "}
            {model?.name ??
              "Modelo não informado"}
          </p>

          {manual.description && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {
                manual.description
              }
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5 text-sm md:grid-cols-3">
            <Info
              label="Ano"
              value={
                manual.year
                  ? String(
                      manual.year,
                    )
                  : model?.year_start
                    ? String(
                        model.year_start,
                      )
                    : "—"
              }
            />

            <Info
              label="Motor"
              value={
                model?.engine ??
                "—"
              }
            />

            <Info
              label="Cilindrada"
              value={
                model?.displacement_cc
                  ? `${model.displacement_cc} cc`
                  : "—"
              }
            />

            <Info
              label="Formato"
              value={
                manual.format
                  ?.toUpperCase() ??
                "PDF"
              }
            />

            <Info
              label="Idioma"
              value={
                manual.language ??
                "pt-BR"
              }
            />

            <Info
              label="Atualizado"
              value={
                manual.last_updated
                  ? new Date(
                      manual.last_updated,
                    ).toLocaleDateString(
                      "pt-BR",
                    )
                  : "—"
              }
            />
          </div>

          {Array.isArray(
            manual.tags,
          ) &&
            manual.tags.length >
              0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {manual.tags.map(
                  (
                    tag: string,
                  ) => (
                    <span
                      key={tag}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={
                handleDownloadClick
              }
              disabled={
                downloadMutation.isPending ||
                downloadLockedRef.current
              }
              className="glow inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloadMutation.isPending ||
              downloadLockedRef.current ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}

              {downloadMutation.isPending ||
              downloadLockedRef.current
                ? "Liberando..."
                : "Baixar manual"}
            </button>

            <button
              type="button"
              onClick={() =>
                favoriteMutation.mutate()
              }
              disabled={
                favoriteMutation.isPending
              }
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isFavorite
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-secondary"
              }`}
            >
              {favoriteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart
                  className={`h-4 w-4 ${
                    isFavorite
                      ? "fill-current"
                      : ""
                  }`}
                />
              )}

              {isFavorite
                ? "Favoritado"
                : "Favoritar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualThumbnail({
  title,
  thumbnailUrl,
  driveFileId,
}: ManualThumbnailProps) {
  const thumbnailCandidates =
    useMemo(() => {
      const candidates:
        string[] = [];

      const normalizedThumbnail =
        thumbnailUrl?.trim();

      if (
        normalizedThumbnail
      ) {
        candidates.push(
          normalizedThumbnail,
        );
      }

      const normalizedDriveFileId =
        driveFileId?.trim();

      if (
        normalizedDriveFileId
      ) {
        candidates.push(
          `https://drive.google.com/thumbnail?id=${encodeURIComponent(
            normalizedDriveFileId,
          )}&sz=w1200`,
        );

        candidates.push(
          `https://lh3.googleusercontent.com/d/${encodeURIComponent(
            normalizedDriveFileId,
          )}=w1200`,
        );
      }

      return Array.from(
        new Set(candidates),
      );
    }, [
      thumbnailUrl,
      driveFileId,
    ]);

  const [
    candidateIndex,
    setCandidateIndex,
  ] = useState(0);

  const [
    imageLoaded,
    setImageLoaded,
  ] = useState(false);

  const [
    allCandidatesFailed,
    setAllCandidatesFailed,
  ] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setImageLoaded(false);
    setAllCandidatesFailed(false);
  }, [
    thumbnailUrl,
    driveFileId,
  ]);

  const currentThumbnail =
    thumbnailCandidates[
      candidateIndex
    ];

  function handleImageError() {
    setImageLoaded(false);

    const nextIndex =
      candidateIndex + 1;

    if (
      nextIndex <
      thumbnailCandidates.length
    ) {
      setCandidateIndex(
        nextIndex,
      );

      return;
    }

    setAllCandidatesFailed(
      true,
    );
  }

  const showImage =
    Boolean(
      currentThumbnail,
    ) &&
    !allCandidatesFailed;

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted">
      {showImage && (
        <img
          key={currentThumbnail}
          src={currentThumbnail}
          alt={`Capa do manual ${title}`}
          className={`h-full w-full object-contain transition-opacity duration-300 ${
            imageLoaded
              ? "opacity-100"
              : "opacity-0"
          }`}
          loading="eager"
          referrerPolicy="no-referrer"
          onLoad={() =>
            setImageLoaded(
              true,
            )
          }
          onError={
            handleImageError
          }
        />
      )}

      {showImage &&
        !imageLoaded && (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/10 to-transparent">
            <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
          </div>
        )}

      {!showImage && (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/20 via-background to-transparent p-8">
          <div className="text-center">
            {thumbnailCandidates.length >
            0 ? (
              <ImageOff className="mx-auto h-14 w-14 text-primary/50" />
            ) : (
              <FileText className="mx-auto h-16 w-16 text-primary/60" />
            )}

            <p className="mt-4 line-clamp-3 text-sm font-medium text-foreground">
              {title}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              {thumbnailCandidates.length >
              0
                ? "Não foi possível carregar a capa."
                : "Capa não disponível."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function handleDownloadFailure(
  reason: DownloadFailureReason,
  navigate: ReturnType<
    typeof useNavigate
  >,
) {
  switch (reason) {
    case "no_subscription":
      toast.error(
        "Você precisa de uma assinatura ativa para baixar este manual.",
      );

      navigate({
        to: "/assinatura",
      });

      return;

    case "inactive_subscription":
      toast.error(
        "Sua assinatura não está ativa. Regularize seu plano para continuar.",
      );

      navigate({
        to: "/assinatura",
      });

      return;

    case "expired_subscription":
      toast.error(
        "Sua assinatura expirou. Renove para continuar baixando.",
      );

      navigate({
        to: "/assinatura",
      });

      return;

    case "file_not_ready":
      toast.error(
        "O arquivo deste manual ainda não está disponível para download.",
      );

      return;

    case "not_found":
      toast.error(
        "Manual não encontrado.",
      );

      return;

    default:
      toast.error(
        "Não foi possível liberar o download.",
      );
  }
}

function normalizeRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (!value) {
    return null;
  }

  if (
    Array.isArray(value)
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error ===
      "object" &&
    "message" in error &&
    typeof error.message ===
      "string"
  ) {
    return error.message;
  }

  return fallback;
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-medium">
        {value}
      </p>
    </div>
  );
}

function formatBytes(
  bytes: number,
): string {
  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}