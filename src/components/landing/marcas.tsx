
type Brand = {
  name: string;
  img: string;
};

const BRANDS_ROW_1: Brand[] = [
  {
    name: "Honda",
    img: "https://i.ibb.co/Wvzzdprb/hondal-1024x799.webp",
  },
  {
    name: "Yamaha",
    img: "https://i.ibb.co/JFCtg1Sm/YAMAHA-813x1024.webp",
  },
  {
    name: "Kawasaki",
    img: "https://i.ibb.co/HTgDLmVn/KAWASAKI.webp",
  },
  {
    name: "Suzuki",
    img: "https://i.ibb.co/j9nM5D2D/SUZUKI-1024x1024.webp",
  },
  {
    name: "BMW",
    img: "https://i.ibb.co/Mk8sYKbf/BMW.webp",
  },
  {
    name: "Harley-Davidson",
    img: "https://i.ibb.co/Z6yGSrxV/HARLEY-DAVIDSON.webp",
  },
];

const BRANDS_ROW_2: Brand[] = [
  {
    name: "Dafra",
    img: "https://i.ibb.co/BVmgRq2p/dafra.png",
  },
  {
    name: "Royal Enfield",
    img: "https://i.ibb.co/60zcrB2x/ROYAL-ENFIELD-1024x494.webp",
  },
  {
    name: "Sundown",
    img: "https://i.ibb.co/wrRbG6nf/sundown-motos-vector-logo.webp",
  },
  {
    name: "KTM",
    img: "https://i.ibb.co/p6HhMxFs/KTM.webp",
  },
  {
    name: "Husqvarna",
    img: "https://i.ibb.co/3mSkrvXj/HUSQVARNA-1024x675.webp",
  },
  {
    name: "Ducati",
    img: "https://i.ibb.co/RGk58vrB/DUCATI-1024x1024.webp",
  },
];

export function Marcas() {
  return (
    <section
      id="marcas"
      className="relative w-full min-w-0 overflow-hidden border-y border-white/5 bg-gradient-to-b from-[#071a33] via-[#0a1f3d] to-[#06101f] py-12 sm:py-14 md:py-16"
    >
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_60%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(59,130,246,0.10),transparent_70%)]" />

      {/* Fades verticais */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-20 w-full bg-gradient-to-b from-black/90 to-transparent sm:h-24" />

      <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-20 w-full bg-gradient-to-t from-black/90 to-transparent sm:h-24" />

      {/* Fades laterais */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-[#06101f] to-transparent sm:w-16 md:w-24" />

      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-[#06101f] to-transparent sm:w-16 md:w-24" />

      <div className="relative z-30 mx-auto mb-8 w-full max-w-7xl px-4 text-center sm:mb-10 sm:px-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary sm:text-xs">
          Cobertura completa
        </p>

        <h2 className="mx-auto mt-3 max-w-3xl text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
          As maiores{" "}
          <span className="text-primary">
            marcas
          </span>{" "}
          do mundo na sua mão
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Encontre manuais técnicos das principais montadoras em um só lugar.
        </p>
      </div>

      <div className="relative z-30 flex min-w-0 flex-col gap-4 sm:gap-5 md:gap-6">
        <MarqueeRow
          brands={BRANDS_ROW_1}
          direction="left"
        />

        <MarqueeRow
          brands={BRANDS_ROW_2}
          direction="right"
        />
      </div>
    </section>
  );
}

function MarqueeRow({
  brands,
  direction,
}: {
  brands: Brand[];
  direction: "left" | "right";
}) {
  const repeatedBrands = [
    ...brands,
    ...brands,
    ...brands,
  ];

  return (
    <div className="group flex w-full min-w-0 overflow-hidden">
      <div
        className={`flex w-max min-w-max gap-3 whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused] sm:gap-4 md:gap-5 ${
          direction === "left"
            ? "animate-marquee-left"
            : "animate-marquee-right"
        }`}
      >
        {repeatedBrands.map(
          (brand, index) => (
            <BrandCard
              key={`${direction}-${brand.name}-${index}`}
              brand={brand}
            />
          ),
        )}
      </div>
    </div>
  );
}

function BrandCard({
  brand,
}: {
  brand: Brand;
}) {
  return (
    <article className="group/card flex h-20 w-32 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 shadow-lg backdrop-blur-md transition duration-300 hover:border-primary/40 hover:bg-white/10 sm:h-24 sm:w-40 sm:rounded-2xl sm:p-4 md:h-28 md:w-48 lg:h-32 lg:w-56">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <img
          src={brand.img}
          alt={`Logo ${brand.name}`}
          loading="lazy"
          className="max-h-full max-w-[78%] object-contain opacity-70 transition duration-500 group-hover/card:scale-105 group-hover/card:opacity-100"
        />
      </div>

      <span
        className="mt-2 block max-w-full truncate text-center text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-400 transition-colors group-hover/card:text-primary sm:text-[9px] md:text-[10px]"
        title={brand.name}
      >
        {brand.name}
      </span>
    </article>
  );
}

export default Marcas;
