
//
// Estrutura principal suportada:
//
// MANUAIS UNIDOS/
//   HONDA/
//     CG160.pdf
//     CB500X.pdf
//
//   YAMAHA/
//     FAZER250.pdf
//
// Cada arquivo retornado pela função listDriveFilesRecursive()
// contém o nome da pasta pai e todo o caminho de pastas.

type ParsedManualType =
  | "service"
  | "owner"
  | "wiring"
  | "parts"
  | "bulletin";

type DriveMode =
  | {
      mode: "lovable";
      lovableApiKey: string;
      googleDriveApiKey: string;
    }
  | {
      mode: "google";
      googleDriveApiKey: string;
    };

type DriveFolderStackItem = {
  id: string;
  name: string;
  path: string[];
};

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "zip",
  "rar",
  "7z",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

const TYPE_ALIASES: Array<{
  type: ParsedManualType;
  terms: string[];
}> = [
  {
    type: "service",
    terms: [
      "servicemanual",
      "manualdeservico",
      "manualservico",
      "manualdeoficina",
      "manualoficina",
      "workshopmanual",
      "workshop",
      "repairmanual",
      "manualdereparo",
      "manualreparo",
      "servico",
      "service",
      "oficina",
      "reparacao",
      "manutencao",
    ],
  },
  {
    type: "owner",
    terms: [
      "ownermanual",
      "manualdoproprietario",
      "manualproprietario",
      "manualdousuario",
      "manualusuario",
      "manualdeusuario",
      "owner",
      "proprietario",
      "usuario",
    ],
  },
  {
    type: "wiring",
    terms: [
      "wiringdiagram",
      "electricaldiagram",
      "diagramadefiacao",
      "diagramaeletrico",
      "esquemaeletrico",
      "sistemaeletrico",
      "diagramafios",
      "wiring",
      "eletrico",
      "fiacao",
    ],
  },
  {
    type: "parts",
    terms: [
      "partscatalog",
      "catalogodepecas",
      "catalogopecas",
      "manualdepecas",
      "manualpecas",
      "partslist",
      "listadepecas",
      "parts",
      "pecas",
    ],
  },
  {
    type: "bulletin",
    terms: [
      "technicalbulletin",
      "techbulletin",
      "boletimtecnico",
      "boletimdeservico",
      "servicebulletin",
      "informativotecnico",
      "bulletin",
      "boletim",
    ],
  },
];

const KNOWN_BRANDS = [
  "Harley Davidson",
  "Royal Enfield",
  "BMW Motorrad",
  "Moto Guzzi",
  "MV Agusta",
  "Can Am",
  "Honda",
  "Yamaha",
  "Suzuki",
  "Kawasaki",
  "Ducati",
  "Triumph",
  "KTM",
  "Husqvarna",
  "Aprilia",
  "Benelli",
  "Bajaj",
  "Dafra",
  "Shineray",
  "Haojue",
  "CFMoto",
  "Polaris",
  "Kymco",
  "Piaggio",
  "Vespa",
  "Indian",
  "Victory",
  "Buell",
  "Kasinski",
  "Sundown",
  "Traxx",
  "Bravax",
  "Mottu",
];

const REMOVABLE_TERMS = [
  "service manual",
  "manual de serviço",
  "manual de servico",
  "manual serviço",
  "manual servico",
  "manual de oficina",
  "manual oficina",
  "workshop manual",
  "workshop",
  "repair manual",
  "manual de reparo",
  "manual reparo",
  "owner manual",
  "manual do proprietário",
  "manual do proprietario",
  "manual proprietário",
  "manual proprietario",
  "manual do usuário",
  "manual do usuario",
  "manual usuário",
  "manual usuario",
  "wiring diagram",
  "electrical diagram",
  "diagrama elétrico",
  "diagrama eletrico",
  "esquema elétrico",
  "esquema eletrico",
  "sistema elétrico",
  "sistema eletrico",
  "parts catalog",
  "catálogo de peças",
  "catalogo de pecas",
  "catálogo peças",
  "catalogo pecas",
  "manual de peças",
  "manual de pecas",
  "technical bulletin",
  "tech bulletin",
  "boletim técnico",
  "boletim tecnico",
  "boletim de serviço",
  "boletim de servico",
  "service bulletin",
  "manual",
  "serviço",
  "servico",
  "service",
  "oficina",
  "owner",
  "proprietário",
  "proprietario",
  "usuário",
  "usuario",
  "wiring",
  "elétrico",
  "eletrico",
  "parts",
  "peças",
  "pecas",
  "bulletin",
  "boletim",
  "pdf",
];

export type ParsedFilename = {
  brand: string;
  model: string;
  yearStart: number | null;
  yearEnd: number | null;
  manualType: ParsedManualType;
  format: string;
};

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;

  /**
   * ID da pasta que contém diretamente o arquivo.
   */
  parentFolderId?: string;

  /**
   * Nome da pasta que contém diretamente o arquivo.
   *
   * Exemplo:
   * MANUAIS UNIDOS/HONDA/CG160.pdf
   *
   * parentFolderName = "HONDA"
   */
  parentFolderName?: string;

  /**
   * Caminho completo de pastas, incluindo a raiz.
   *
   * Exemplo:
   * ["MANUAIS UNIDOS", "HONDA"]
   */
  folderPath?: string[];

  /**
   * Primeira pasta abaixo da raiz sincronizada.
   *
   * Exemplo:
   * MANUAIS UNIDOS/HONDA/CG160.pdf
   *
   * brandFolderName = "HONDA"
   */
  brandFolderName?: string;
};

type RawDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
};

type DriveListResponse = {
  files?: RawDriveFile[];
  nextPageToken?: string;
};

export type DriveFolder = {
  id: string;
  name: string;
  mimeType: "application/vnd.google-apps.folder";
};

export type DriveFilesPage = {
  files: DriveFile[];
  nextPageToken: string | null;
};

const LOVABLE_GATEWAY =
  "https://connector-gateway.lovable.dev/google_drive";

const GOOGLE_DRIVE_API =
  "https://www.googleapis.com/drive/v3";

function getServerEnv(
  name: string,
): string | undefined {
  const value =
    process.env[name];

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return undefined;
  }

  return value
    .trim()
    .replace(
      /^["']|["']$/g,
      "",
    );
}

function getDriveConfig(): DriveMode {
  const lovableApiKey =
    getServerEnv(
      "LOVABLE_API_KEY",
    );

  const googleDriveApiKey =
    getServerEnv(
      "GOOGLE_DRIVE_API_KEY",
    );

  if (
    lovableApiKey &&
    googleDriveApiKey
  ) {
    return {
      mode: "lovable",
      lovableApiKey,
      googleDriveApiKey,
    };
  }

  if (googleDriveApiKey) {
    return {
      mode: "google",
      googleDriveApiKey,
    };
  }

  throw new Error(
    "Google Drive não configurado. Adicione GOOGLE_DRIVE_API_KEY no ambiente do servidor.",
  );
}

function buildDriveUrl(
  path: string,
  params?: URLSearchParams,
): string {
  const config =
    getDriveConfig();

  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  if (
    config.mode ===
    "lovable"
  ) {
    const query =
      params?.toString();

    return `${LOVABLE_GATEWAY}/drive/v3${normalizedPath}${
      query
        ? `?${query}`
        : ""
    }`;
  }

  const finalParams =
    new URLSearchParams(
      params,
    );

  finalParams.set(
    "key",
    config.googleDriveApiKey,
  );

  return `${GOOGLE_DRIVE_API}${normalizedPath}?${finalParams.toString()}`;
}

function driveHeaders(): Record<
  string,
  string
> {
  const config =
    getDriveConfig();

  if (
    config.mode ===
    "lovable"
  ) {
    return {
      Authorization:
        `Bearer ${config.lovableApiKey}`,

      "X-Connection-Api-Key":
        config.googleDriveApiKey,

      Accept:
        "application/json",
    };
  }

  return {
    Accept:
      "application/json",
  };
}

async function driveFetch(
  path: string,
  options?: {
    params?: URLSearchParams;
    method?: string;
    headers?: Record<
      string,
      string
    >;
  },
): Promise<Response> {
  const url =
    buildDriveUrl(
      path,
      options?.params,
    );

  return fetch(url, {
    method:
      options?.method ??
      "GET",

    headers: {
      ...driveHeaders(),
      ...options?.headers,
    },
  });
}

export function slugify(
  input: string,
): string {
  return input
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function removeAccents(
  value: string,
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    );
}

function normKey(
  value: string,
): string {
  return removeAccents(
    value,
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      "",
    );
}

function cleanFilenamePart(
  value: string,
): string {
  return value
    .replace(
      /[_–—]+/g,
      " ",
    )
    .replace(
      /\s*-\s*/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .replace(
      /^[,.;:|/\\\s]+/,
      "",
    )
    .replace(
      /[,.;:|/\\\s]+$/,
      "",
    )
    .trim();
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

function escapeRegExp(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function detectManualType(
  filename: string,
): ParsedManualType | null {
  const normalized =
    normKey(filename);

  for (
    const alias of
    TYPE_ALIASES
  ) {
    const found =
      alias.terms.some(
        (term) =>
          normalized.includes(
            normKey(term),
          ),
      );

    if (found) {
      return alias.type;
    }
  }

  return null;
}

function detectYearRange(
  filename: string,
): {
  yearStart: number | null;
  yearEnd: number | null;
} {
  const rangeMatch =
    filename.match(
      /\b((?:19|20)\d{2})\s*[-–—/]\s*((?:19|20)\d{2})\b/,
    );

  if (rangeMatch) {
    return {
      yearStart:
        Number(
          rangeMatch[1],
        ),

      yearEnd:
        Number(
          rangeMatch[2],
        ),
    };
  }

  const singleYearMatch =
    filename.match(
      /\b((?:19|20)\d{2})\b/,
    );

  if (
    singleYearMatch
  ) {
    const year =
      Number(
        singleYearMatch[1],
      );

    return {
      yearStart:
        year,

      yearEnd:
        year,
    };
  }

  return {
    yearStart:
      null,

    yearEnd:
      null,
  };
}

function removeYears(
  value: string,
): string {
  return value
    .replace(
      /\b((?:19|20)\d{2})\s*[-–—/]\s*((?:19|20)\d{2})\b/g,
      " ",
    )
    .replace(
      /\b((?:19|20)\d{2})\b/g,
      " ",
    );
}

function removeManualTerms(
  value: string,
): string {
  let result =
    value;

  const terms =
    [...REMOVABLE_TERMS].sort(
      (
        first,
        second,
      ) =>
        second.length -
        first.length,
    );

  for (
    const term of terms
  ) {
    const accentlessTerm =
      removeAccents(
        term,
      );

    result =
      result.replace(
        new RegExp(
          `\\b${escapeRegExp(
            accentlessTerm,
          )}\\b`,
          "gi",
        ),
        " ",
      );
  }

  return result;
}

function removeNoise(
  value: string,
): string {
  const accentless =
    removeAccents(value);

  const withoutYears =
    removeYears(
      accentless,
    );

  const withoutManualTerms =
    removeManualTerms(
      withoutYears,
    );

  return cleanFilenamePart(
    withoutManualTerms,
  );
}

function findKnownBrand(
  value: string,
): {
  brand: string;
  index: number;
  length: number;
} | null {
  const normalizedValue =
    removeAccents(value)
      .toLowerCase();

  const orderedBrands =
    [...KNOWN_BRANDS].sort(
      (
        first,
        second,
      ) =>
        second.length -
        first.length,
    );

  for (
    const brand of
    orderedBrands
  ) {
    const normalizedBrand =
      removeAccents(
        brand,
      ).toLowerCase();

    const index =
      normalizedValue.indexOf(
        normalizedBrand,
      );

    if (
      index >= 0
    ) {
      return {
        brand,
        index,
        length:
          normalizedBrand.length,
      };
    }
  }

  return null;
}

function detectBrandAndModel(
  filename: string,
): {
  brand: string;
  model: string;
} | null {
  const cleaned =
    removeNoise(
      filename,
    );

  if (!cleaned) {
    return null;
  }

  const knownBrand =
    findKnownBrand(
      cleaned,
    );

  if (knownBrand) {
    const beforeBrand =
      cleaned
        .slice(
          0,
          knownBrand.index,
        )
        .trim();

    const afterBrand =
      cleaned
        .slice(
          knownBrand.index +
            knownBrand.length,
        )
        .trim();

    const modelCandidate =
      cleanFilenamePart(
        afterBrand ||
          beforeBrand,
      );

    if (
      !modelCandidate
    ) {
      return null;
    }

    return {
      brand:
        knownBrand.brand,

      model:
        modelCandidate,
    };
  }

  const parts =
    cleaned
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length < 2
  ) {
    return null;
  }

  return {
    brand:
      parts[0],

    model:
      parts
        .slice(1)
        .join(" "),
  };
}

function createFallbackVehicle(
  filenameBase: string,
): {
  brand: string;
  model: string;
} {
  const cleaned =
    cleanFilenamePart(
      removeYears(
        removeAccents(
          filenameBase,
        ),
      ),
    );

  const parts =
    cleaned
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length >= 2
  ) {
    return {
      brand:
        cleanFilenamePart(
          parts[0],
        ) ||
        "Outros",

      model:
        cleanFilenamePart(
          parts
            .slice(1)
            .join(" "),
        ) ||
        "Manual sem identificação",
    };
  }

  return {
    brand:
      "Outros",

    model:
      cleaned ||
      "Manual sem identificação",
  };
}

/**
 * O parser permanece disponível para tentar extrair:
 *
 * - ano;
 * - tipo de manual;
 * - extensão;
 *
 * A sincronização principal não deve usar a marca retornada
 * por esta função quando parentFolderName estiver disponível.
 */
export function parseDriveFilename(
  filename: string,
): ParsedFilename | null {
  const dot =
    filename.lastIndexOf(
      ".",
    );

  if (
    dot <= 0 ||
    dot ===
      filename.length - 1
  ) {
    console.warn(
      `[Drive Parser] Arquivo sem extensão ignorado: ${filename}`,
    );

    return null;
  }

  const base =
    filename.slice(
      0,
      dot,
    );

  const extension =
    filename
      .slice(dot + 1)
      .toLowerCase()
      .trim();

  if (
    !ALLOWED_EXTENSIONS.has(
      extension,
    )
  ) {
    console.warn(
      `[Drive Parser] Extensão não suportada: ${filename}`,
    );

    return null;
  }

  const cleanedBase =
    cleanFilenamePart(
      base,
    );

  if (!cleanedBase) {
    console.warn(
      `[Drive Parser] Nome vazio ignorado: ${filename}`,
    );

    return null;
  }

  const manualType =
    detectManualType(
      cleanedBase,
    ) ??
    "service";

  const {
    yearStart,
    yearEnd,
  } =
    detectYearRange(
      cleanedBase,
    );

  const detectedVehicle =
    detectBrandAndModel(
      cleanedBase,
    );

  const fallbackVehicle =
    createFallbackVehicle(
      cleanedBase,
    );

  const brand =
    cleanFilenamePart(
      detectedVehicle
        ?.brand ??
        fallbackVehicle.brand,
    ) ||
    "Outros";

  const model =
    cleanFilenamePart(
      detectedVehicle
        ?.model ??
        fallbackVehicle.model,
    ) ||
    "Manual sem identificação";

  return {
    brand,
    model,
    yearStart,
    yearEnd,
    manualType,
    format:
      extension,
  };
}

/**
 * Lista apenas as subpastas diretas da pasta raiz.
 *
 * Exemplo:
 *
 * MANUAIS UNIDOS/
 *   HONDA/
 *   YAMAHA/
 *   SUZUKI/
 *
 * Essa função deve ser usada na primeira etapa da sincronização
 * para criar todas as montadoras e preparar a fila.
 */
export async function listDriveChildFolders(
  folderId: string,
): Promise<DriveFolder[]> {
  const normalizedFolderId =
    extractDriveId(folderId);

  if (!normalizedFolderId) {
    throw new Error(
      "ID da pasta do Google Drive não informado.",
    );
  }

  if (normalizedFolderId === ".") {
    throw new Error(
      'O ID da pasta não pode ser ".". Informe o ID ou a URL correta do Google Drive.',
    );
  }

  const folders: DriveFolder[] = [];

  let pageToken:
    | string
    | undefined;

  do {
    const params =
      new URLSearchParams({
        q: `'${normalizedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields:
          "nextPageToken,files(id,name,mimeType)",
        pageSize:
          "1000",
        orderBy:
          "name",
        supportsAllDrives:
          "true",
        includeItemsFromAllDrives:
          "true",
      });

    if (pageToken) {
      params.set(
        "pageToken",
        pageToken,
      );
    }

    const response =
      await driveFetch(
        "/files",
        {
          params,
        },
      );

    if (!response.ok) {
      const responseBody =
        await response.text();

      throw new Error(
        `Falha ao listar as montadoras [${response.status}]: ${responseBody}`,
      );
    }

    const result =
      (await response.json()) as
        DriveListResponse;

    for (
      const item of
      result.files ?? []
    ) {
      if (
        item.mimeType !==
        "application/vnd.google-apps.folder"
      ) {
        continue;
      }

      const name =
        cleanFolderName(
          item.name,
        );

      if (!name) {
        continue;
      }

      folders.push({
        id:
          item.id,
        name,
        mimeType:
          "application/vnd.google-apps.folder",
      });
    }

    pageToken =
      result.nextPageToken;
  } while (pageToken);

  console.log(
    `[Drive] ${folders.length} montadora(s) encontrada(s) na pasta raiz.`,
  );

  return folders;
}

/**
 * Lista uma página de arquivos de apenas uma montadora.
 *
 * O nextPageToken retornado deve ser salvo no Supabase.
 * Na chamada seguinte, envie esse token para continuar
 * exatamente do ponto onde a sincronização parou.
 */
export async function listDriveFilesPage(
  folderId: string,
  options?: {
    folderName?: string;
    rootFolderName?: string;
    pageToken?: string | null;
    pageSize?: number;
  },
): Promise<DriveFilesPage> {
  const normalizedFolderId =
    extractDriveId(folderId);

  if (!normalizedFolderId) {
    throw new Error(
      "ID da pasta da montadora não informado.",
    );
  }

  if (normalizedFolderId === ".") {
    throw new Error(
      'O ID da pasta não pode ser ".".',
    );
  }

  const pageSize =
    Math.min(
      Math.max(
        options?.pageSize ??
          200,
        1,
      ),
      1000,
    );

  const folderMetadata =
    options?.folderName
      ? null
      : await getDriveFileMetadata(
          normalizedFolderId,
        );

  const folderName =
    cleanFolderName(
      options?.folderName ??
        folderMetadata?.name ??
        "",
    ) ||
    "Montadora";

  const rootFolderName =
    cleanFolderName(
      options?.rootFolderName ??
        "",
    );

  const folderPath =
    rootFolderName
      ? [
          rootFolderName,
          folderName,
        ]
      : [
          folderName,
        ];

  const params =
    new URLSearchParams({
      q: `'${normalizedFolderId}' in parents and trashed = false`,
      fields:
        "nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink)",
      pageSize:
        String(pageSize),
      orderBy:
        "name",
      supportsAllDrives:
        "true",
      includeItemsFromAllDrives:
        "true",
    });

  if (
    options?.pageToken
  ) {
    params.set(
      "pageToken",
      options.pageToken,
    );
  }

  const response =
    await driveFetch(
      "/files",
      {
        params,
      },
    );

  if (!response.ok) {
    const responseBody =
      await response.text();

    throw new Error(
      `Falha ao listar arquivos da montadora "${folderName}" [${response.status}]: ${responseBody}`,
    );
  }

  const result =
    (await response.json()) as
      DriveListResponse;

  const files:
    DriveFile[] = [];

  for (
    const item of
    result.files ?? []
  ) {
    /*
     * A estrutura esperada possui os arquivos diretamente
     * dentro da pasta da montadora. Subpastas são ignoradas
     * nesta função paginada.
     */
    if (
      item.mimeType ===
      "application/vnd.google-apps.folder"
    ) {
      continue;
    }

    files.push({
      id:
        item.id,
      name:
        item.name,
      mimeType:
        item.mimeType,
      size:
        item.size,
      modifiedTime:
        item.modifiedTime,
      thumbnailLink:
        item.thumbnailLink,
      parentFolderId:
        normalizedFolderId,
      parentFolderName:
        folderName,
      folderPath,
      brandFolderName:
        folderName,
    });
  }

  console.log(
    "[Drive] Página da montadora carregada:",
    {
      folderId:
        normalizedFolderId,
      folderName,
      arquivos:
        files.length,
      temProximaPagina:
        Boolean(
          result.nextPageToken,
        ),
    },
  );

  return {
    files,
    nextPageToken:
      result.nextPageToken ??
      null,
  };
}

/**
 * Lista os arquivos recursivamente preservando o caminho
 * completo de cada pasta.
 *
 * Mantida por compatibilidade com o sincronizador antigo.
 * Para bibliotecas grandes, prefira:
 *
 * - listDriveChildFolders()
 * - listDriveFilesPage()
 */
export async function listDriveFilesRecursive(
  folderId: string,
  maxFiles = 100_000,
): Promise<DriveFile[]> {
  const normalizedFolderId =
    extractDriveId(folderId);

  if (!normalizedFolderId) {
    throw new Error(
      "ID da pasta do Google Drive não informado.",
    );
  }

  if (normalizedFolderId === ".") {
    throw new Error(
      'O ID da pasta não pode ser ".". Informe o ID ou a URL correta do Google Drive.',
    );
  }

  const rootMetadata =
    await getDriveFileMetadata(
      normalizedFolderId,
    );

  if (!rootMetadata) {
    throw new Error(
      `Não foi possível localizar a pasta raiz do Google Drive: ${normalizedFolderId}`,
    );
  }

  if (
    rootMetadata.mimeType !==
    "application/vnd.google-apps.folder"
  ) {
    throw new Error(
      `"${rootMetadata.name}" não é uma pasta do Google Drive.`,
    );
  }

  const rootFolderName =
    cleanFolderName(
      rootMetadata.name,
    ) || "Pasta raiz";

  const files: DriveFile[] = [];

  /*
   * Usa fila, não pilha.
   *
   * Isso faz a leitura por níveis:
   * 1. encontra todas as montadoras;
   * 2. depois percorre o conteúdo delas.
   *
   * Evita uma única montadora consumir todo o limite
   * antes das demais serem visitadas.
   */
  const folderQueue: DriveFolderStackItem[] = [
    {
      id: normalizedFolderId,
      name: rootFolderName,
      path: [rootFolderName],
    },
  ];

  const visitedFolders =
    new Set<string>();

  let queueIndex = 0;

  while (
    queueIndex < folderQueue.length &&
    files.length < maxFiles
  ) {
    const currentFolder =
      folderQueue[queueIndex];

    queueIndex += 1;

    if (
      !currentFolder ||
      visitedFolders.has(
        currentFolder.id,
      )
    ) {
      continue;
    }

    visitedFolders.add(
      currentFolder.id,
    );

    let pageToken:
      | string
      | undefined;

    do {
      const params =
        new URLSearchParams({
          q: `'${currentFolder.id}' in parents and trashed = false`,

          fields:
            "nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink)",

          pageSize: "1000",

          supportsAllDrives: "true",

          includeItemsFromAllDrives:
            "true",
        });

      if (pageToken) {
        params.set(
          "pageToken",
          pageToken,
        );
      }

      const response =
        await driveFetch(
          "/files",
          {
            params,
          },
        );

      if (!response.ok) {
        const responseBody =
          await response.text();

        throw new Error(
          `Falha ao listar a pasta "${currentFolder.name}" [${response.status}]: ${responseBody}`,
        );
      }

      const result =
        (await response.json()) as
          DriveListResponse;

      for (
        const item of
        result.files ?? []
      ) {
        const itemName =
          cleanFolderName(
            item.name,
          );

        if (
          item.mimeType ===
          "application/vnd.google-apps.folder"
        ) {
          const childPath = [
            ...currentFolder.path,
            itemName ||
              "Pasta sem nome",
          ];

          /*
           * Adiciona no final da fila.
           * Não usa unshift nem pop.
           */
          folderQueue.push({
            id: item.id,

            name:
              itemName ||
              "Pasta sem nome",

            path: childPath,
          });

          console.log(
            "[Drive] Pasta encontrada:",
            {
              id: item.id,
              name: itemName,
              path:
                childPath.join(
                  " / ",
                ),
            },
          );

          continue;
        }

        const relativePath =
          currentFolder.path.slice(1);

        /*
         * Primeira pasta abaixo da raiz.
         *
         * MANUAIS UNIDOS/HONDA/arquivo.pdf
         * brandFolderName = HONDA
         */
        const brandFolderName =
          relativePath[0] ??
          currentFolder.name;

        files.push({
          id: item.id,
          name: item.name,
          mimeType:
            item.mimeType,
          size: item.size,
          modifiedTime:
            item.modifiedTime,
          thumbnailLink:
            item.thumbnailLink,

          parentFolderId:
            currentFolder.id,

          parentFolderName:
            currentFolder.name,

          folderPath: [
            ...currentFolder.path,
          ],

          brandFolderName:
            cleanFolderName(
              brandFolderName,
            ),
        });

        if (
          files.length >=
          maxFiles
        ) {
          console.warn(
            `[Drive] Limite de ${maxFiles} arquivos atingido.`,
          );

          break;
        }
      }

      pageToken =
        result.nextPageToken;
    } while (
      pageToken &&
      files.length < maxFiles
    );

    console.log(
      "[Drive] Progresso:",
      {
        pastaAtual:
          currentFolder.path.join(
            " / ",
          ),

        pastasVisitadas:
          visitedFolders.size,

        pastasDescobertas:
          folderQueue.length,

        pastasPendentes:
          folderQueue.length -
          queueIndex,

        arquivosEncontrados:
          files.length,
      },
    );
  }

  console.log(
    `[Drive] Finalizado: ${files.length} arquivo(s) em ${visitedFolders.size} pasta(s).`,
  );

  if (
    queueIndex <
    folderQueue.length
  ) {
    console.warn(
      `[Drive] A sincronização parou no limite de ${maxFiles} arquivos. Ainda restaram ${
        folderQueue.length -
        queueIndex
      } pasta(s) pendentes.`,
    );
  }

  return files;
}

export async function fetchDriveFileStream(
  fileId: string,
): Promise<Response> {
  const normalizedFileId =
    extractDriveId(
      fileId,
    );

  if (
    !normalizedFileId
  ) {
    throw new Error(
      "ID do arquivo do Google Drive não informado.",
    );
  }

  const params =
    new URLSearchParams({
      alt:
        "media",

      supportsAllDrives:
        "true",
    });

  return driveFetch(
    `/files/${encodeURIComponent(
      normalizedFileId,
    )}`,
    {
      params,

      headers: {
        Accept:
          "application/octet-stream",
      },
    },
  );
}

export async function getDriveFileMetadata(
  fileId: string,
): Promise<DriveFile | null> {
  const normalizedFileId =
    extractDriveId(
      fileId,
    );

  if (
    !normalizedFileId ||
    normalizedFileId ===
      "."
  ) {
    return null;
  }

  const params =
    new URLSearchParams({
      fields:
        "id,name,mimeType,size,modifiedTime,thumbnailLink",

      supportsAllDrives:
        "true",
    });

  const response =
    await driveFetch(
      `/files/${encodeURIComponent(
        normalizedFileId,
      )}`,
      {
        params,
      },
    );

  if (
    !response.ok
  ) {
    const body =
      await response.text();

    console.error(
      `[Google Drive] Falha ao buscar metadados [${response.status}]:`,
      body,
    );

    return null;
  }

  return (
    await response.json()
  ) as DriveFile;
}

/**
 * Aceita:
 *
 * 15vZSzTK5HAn7_2hUYHr8ozp5lqYl4vCv
 *
 * https://drive.google.com/drive/folders/ID
 *
 * https://drive.google.com/open?id=ID
 *
 * https://drive.google.com/file/d/ID/view
 */
function extractDriveId(
  value: string,
): string {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    !trimmed.includes(
      "drive.google.com",
    )
  ) {
    return trimmed;
  }

  try {
    const url =
      new URL(trimmed);

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