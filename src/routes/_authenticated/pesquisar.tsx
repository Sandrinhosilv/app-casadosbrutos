import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  FileText,
  Search,
} from "lucide-react";

import { searchLibrary } from "@/lib/manuals.functions";

const SUGGESTIONS = [
  // Tratores
  "Massey Ferguson 290",
  "Massey Ferguson 275",
  "John Deere 6110J",
  "John Deere 5078E",
  "Valtra A950",
  "Valtra BH180",
  "New Holland TT4030",
  "New Holland TL75",
  "Case IH Puma",
  "Ford 6600",

  // Colheitadeiras
  "John Deere S550",
  "John Deere S660",
  "New Holland TC5090",
  "Case IH Axial Flow",
  "Massey Ferguson MF5650",

  // Escavadeiras
  "CAT 320",
  "CAT 336",
  "Komatsu PC200",
  "Komatsu PC210",
  "Hyundai R220LC",
  "Doosan DX225",
  "Volvo EC210",
  "JCB JS220",

  // Retroescavadeiras
  "JCB 3CX",
  "CAT 416F",
  "Case 580N",
  "New Holland B95B",

  // Pás Carregadeiras
  "CAT 924K",
  "Komatsu WA200",
  "Volvo L90H",
  "SDLG LG936L",

  // Motoniveladoras
  "CAT 140K",
  "Komatsu GD555",
  "New Holland RG170B",

  // Tratores de Esteira
  "CAT D6T",
  "Komatsu D65",
  "John Deere 850J",

  // Caminhões
  "Scania R440",
  "Scania R500",
  "Volvo FH540",
  "Volvo FMX",
  "Mercedes Actros",
  "Mercedes Atego",
  "Volkswagen Constellation",
  "Ford Cargo",
  "Iveco Hi-Way",
  "DAF XF",

  // Motores Diesel
  "Cummins ISB",
  "Cummins ISC",
  "MWM X12",
  "Perkins 1104",
  "Perkins 1106",
  "Deutz BF4M",
  "Yanmar 4TNV",
  "Caterpillar C7",
  "Caterpillar C9",

  // Implementos Agrícolas
  "Plantadeira Stara",
  "Plantadeira Jumil",
  "Pulverizador Jacto",
  "Pulverizador Uniport",
  "Semeadora Baldan",
  "Grade Tatu",
];

export const Route = createFileRoute(
  "/_authenticated/pesquisar",
)({
  head: () => ({
    meta: [
      {
        title:
          "Pesquisar — Casa dos Brutos",
      },
    ],
  }),

  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] =
    useState("");

  const debounced =
    useDebounced(
      q,
      200,
    );

  const search =
    useServerFn(
      searchLibrary,
    );

  const {
    data,
    isFetching,
  } = useQuery({
    queryKey: [
      "search",
      debounced,
    ],

    queryFn: () =>
      search({
        data: {
          q: debounced,
          limit: 30,
        },
      }),

    placeholderData:
      (previous) =>
        previous,
  });

  const filteredSuggestions =
    useMemo(
      () =>
        q.length > 0
          ? SUGGESTIONS.filter(
              (suggestion) =>
                suggestion
                  .toLowerCase()
                  .includes(
                    q.toLowerCase(),
                  ),
            ).slice(0, 8)
          : SUGGESTIONS.slice(
              0,
              12,
            ),
      [q],
    );

  const resultCount =
    data?.length ?? 0;

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10">
      <div className="min-w-0 max-w-full">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Pesquisar
        </h1>

        <p className="mt-2 max-w-full break-words text-sm leading-relaxed text-muted-foreground">
          Marca, modelo, ano, motor,
          cilindrada, ECU, categoria
          ou palavra-chave.
        </p>
      </div>

      <section className="mt-8 min-w-0 max-w-full">
        <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 sm:px-5">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />

          <input
            autoFocus
            value={q}
            onChange={(
              event,
            ) =>
              setQ(
                event.target
                  .value,
              )
            }
            placeholder="Ex.: KOMATSU, CASE, JOHN DEERE..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:text-base"
          />

          {isFetching && (
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />
          )}
        </div>

        <div className="mt-4 flex min-w-0 max-w-full flex-wrap gap-2 overflow-hidden">
          {filteredSuggestions.map(
            (suggestion) => (
              <button
                key={
                  suggestion
                }
                type="button"
                onClick={() =>
                  setQ(
                    suggestion,
                  )
                }
                className="max-w-full rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <span className="block max-w-full truncate">
                  {suggestion}
                </span>
              </button>
            ),
          )}
        </div>
      </section>

      <section className="mt-10 min-w-0 max-w-full overflow-hidden">
        <div className="mb-4 flex min-w-0 max-w-full items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs uppercase tracking-wider text-muted-foreground">
            {data
              ? `${resultCount} resultado${
                  resultCount ===
                  1
                    ? ""
                    : "s"
                }`
              : "Resultados"}
          </p>

          {isFetching && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              Pesquisando...
            </span>
          )}
        </div>

        {(!data ||
          data.length ===
            0) &&
          !isFetching && (
            <div className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-dashed border-border px-5 py-12 text-center sm:p-12">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

              <p className="break-words text-sm leading-relaxed text-muted-foreground">
                {q
                  ? "Nenhum manual encontrado. Tente outros termos."
                  : "Comece digitando para pesquisar na biblioteca."}
              </p>
            </div>
          )}

        <div className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          <AnimatePresence>
            {data?.map(
              (
                result: any,
                index: number,
              ) => (
                <motion.div
                  key={
                    result.manual_id
                  }
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.2,
                    delay:
                      index *
                      0.02,
                  }}
                  className="min-w-0 max-w-full overflow-hidden"
                >
                  <Link
                    to="/manuais/$id"
                    params={{
                      id:
                        result.manual_id,
                    }}
                    className="group flex min-w-0 max-w-full items-start gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card/80 sm:items-center sm:gap-4"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:h-14 sm:w-14">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p
                        className="block w-full min-w-0 truncate text-sm font-medium"
                        title={
                          result.title
                        }
                      >
                        {result.title ??
                          "Manual sem título"}
                      </p>

                      <p
                        className="mt-0.5 block w-full min-w-0 truncate text-xs text-muted-foreground"
                        title={buildSubtitle(
                          result,
                        )}
                      >
                        {buildSubtitle(
                          result,
                        )}
                      </p>

                      <div className="mt-2 flex min-w-0 max-w-full flex-wrap gap-1.5 overflow-hidden text-[10px] text-muted-foreground">
                        <Tag>
                          {manualTypeLabel(
                            result.manual_type,
                          )}
                        </Tag>

                        {result.displacement_cc && (
                          <Tag>
                            {
                              result.displacement_cc
                            }
                            cc
                          </Tag>
                        )}

                        {result.format && (
                          <Tag>
                            {
                              result.format
                            }
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ),
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

function Tag({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="inline-flex max-w-full items-center overflow-hidden rounded-md border border-border px-1.5 py-0.5">
      <span className="block max-w-full truncate">
        {children}
      </span>
    </span>
  );
}

function buildSubtitle(
  result: any,
): string {
  const vehicle = [
    result.brand_name,
    result.model_name,
  ]
    .filter(
      (
        value,
      ): value is string =>
        typeof value ===
          "string" &&
        value.trim().length >
          0,
    )
    .join(" · ");

  const year =
    result.year_start
      ? result.year_end &&
        result.year_end !==
          result.year_start
        ? `${result.year_start}–${result.year_end}`
        : String(
            result.year_start,
          )
      : "";

  return [
    vehicle,
    year,
  ]
    .filter(Boolean)
    .join(" · ");
}

function manualTypeLabel(
  type: string,
) {
  const map: Record<
    string,
    string
  > = {
    servico:
      "Manual de serviço",

    proprietario:
      "Manual do proprietário",

    pecas:
      "Catálogo de peças",

    diagrama_eletrico:
      "Diagrama elétrico",

    esquema_eletrico:
      "Esquema elétrico",

    injecao:
      "Injeção eletrônica",

    torque:
      "Tabela de torque",

    manutencao:
      "Plano de manutenção",

    hidraulico:
      "Esquema hidráulico",

    boletim:
      "Boletim técnico",

    atualizacao:
      "Atualização",

    outro:
      "Outro",
  };

  return (
    map[type] ??
    type ??
    "Outro"
  );
}

function useDebounced<T>(
  value: T,
  delay: number,
) {
  const [
    debouncedValue,
    setDebouncedValue,
  ] = useState(value);

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          setDebouncedValue(
            value,
          );
        },
        delay,
      );

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    value,
    delay,
  ]);

  return debouncedValue;
}
