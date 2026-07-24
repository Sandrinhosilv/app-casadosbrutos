
import { motion } from "framer-motion";
import { Star } from "lucide-react";

import feedback2 from "@/assets/Feedback (2).avif";
import feedback5 from "@/assets/Feedback (5).avif";
import feedback6 from "@/assets/Feedback (6).avif";
import feedback8 from "@/assets/Feedback (8).avif";
import feedback9 from "@/assets/Feedback (9).avif";
import feedback11 from "@/assets/Feedback (11).avif";

const FEEDBACKS = [
  feedback2,
  feedback5,
  feedback6,
  feedback8,
  feedback9,
  feedback11,
];

export function TestimonialsSection() {
  const topRow = [
    ...FEEDBACKS,
    ...FEEDBACKS,
  ];

  const bottomRow = [
    ...[...FEEDBACKS].reverse(),
    ...[...FEEDBACKS].reverse(),
  ];

  return (
    <section
      id="social-proof"
      className="relative w-full min-w-0 overflow-hidden border-t border-white/5 bg-background py-14 sm:py-16 md:py-20 lg:py-24"
    >
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.10),transparent_65%)]" />

      <div className="pointer-events-none absolute left-0 top-0 h-20 w-full bg-gradient-to-b from-black/60 to-transparent" />

      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-black/60 to-transparent" />

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-7xl">
        {/* Cabeçalho */}
        <div className="px-4 sm:px-6">
          <motion.div
            initial={{
              opacity: 0,
              width: 0,
            }}
            whileInView={{
              opacity: 1,
              width: 96,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
            }}
            className="mx-auto mb-6 h-[3px] rounded-full bg-primary sm:mb-8"
          />

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.5,
            }}
            className="mx-auto mb-8 max-w-4xl text-center sm:mb-10 md:mb-12"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary sm:text-xs">
              Resultados comprovados
            </p>

            <h2 className="mt-3 text-[28px] font-black uppercase leading-[0.98] tracking-tight text-white sm:text-[40px] md:text-[52px] lg:text-[64px]">
              O que os mecânicos
              <br />

              <span className="text-primary">
                dizem do material
              </span>
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Feedbacks reais de profissionais que utilizam o Manual Stock
              diariamente em suas oficinas.
            </p>
          </motion.div>

          <div className="mb-8 flex justify-center sm:mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur-md">
              <Star className="h-4 w-4 fill-primary text-primary" />

              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary sm:text-[11px]">
                Provas reais
              </span>
            </div>
          </div>
        </div>

        {/* Carrosséis */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5 md:gap-6">
          {/* Linha superior */}
          <div className="w-full min-w-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] sm:[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <motion.div
              className="flex w-max min-w-max gap-3 sm:gap-4 md:gap-5"
              initial={{
                x: "0%",
              }}
              animate={{
                x: "-50%",
              }}
              transition={{
                duration: 55,
                ease: "linear",
                repeat: Infinity,
                repeatType: "loop",
              }}
              style={{
                willChange: "transform",
              }}
            >
              {topRow.map((image, index) => (
                <FeedbackCard
                  key={`top-${index}`}
                  image={image}
                  index={index}
                />
              ))}
            </motion.div>
          </div>

          {/* Linha inferior */}
          <div className="w-full min-w-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] sm:[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <motion.div
              className="flex w-max min-w-max gap-3 sm:gap-4 md:gap-5"
              initial={{
                x: "-50%",
              }}
              animate={{
                x: "0%",
              }}
              transition={{
                duration: 55,
                ease: "linear",
                repeat: Infinity,
                repeatType: "loop",
              }}
              style={{
                willChange: "transform",
              }}
            >
              {bottomRow.map((image, index) => (
                <FeedbackCard
                  key={`bottom-${index}`}
                  image={image}
                  index={index}
                />
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeedbackCard({
  image,
  index,
}: {
  image: string;
  index: number;
}) {
  return (
    <article className="w-[190px] shrink-0 sm:w-[230px] md:w-[270px] lg:w-[300px]">
      <div className="overflow-hidden rounded-xl border border-primary/15 bg-zinc-900/60 shadow-[0_0_25px_hsl(var(--primary)/0.08)] transition duration-300 hover:border-primary/40 sm:rounded-2xl">
        <img
          src={image}
          alt={`Depoimento real ${index + 1}`}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full object-cover"
        />
      </div>
    </article>
  );
}

export default TestimonialsSection;

