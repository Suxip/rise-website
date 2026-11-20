import { ExternalLink } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { CATEGORIES, type Program } from "@/data/programs";

const DOTS: Record<string, string> = {
  energy: "bg-energy", water: "bg-water", transportation: "bg-transport", recycling: "bg-recycle",
};

export default function FeaturedProgramsCarousel({ programs }: { programs: Program[] }) {
  if (programs.length === 0) return null;
  return (
    <section className="container py-20 md:py-28" aria-labelledby="featured-programs-heading">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-base font-medium text-primary">Program spotlight</p>
        <h2 id="featured-programs-heading" className="text-4xl md:text-5xl font-semibold tracking-tight">Worth a closer look.</h2>
        <p className="mt-5 mb-10 max-w-2xl text-base md:text-lg text-muted-foreground">Explore rebates and resources for a more sustainable home.</p>
        <Carousel opts={{ align: "start", loop: true }} aria-label="Featured rebates and programs" className="pb-16">
          <CarouselContent className="-ml-5">
            {programs.map((program) => (
              <CarouselItem key={program.id} className="pl-5 md:basis-1/2">
                <article className="flex h-full min-h-80 flex-col rounded-[2rem] bg-muted p-8 md:p-10">
                  <p className="mb-5 flex items-center gap-3 text-base font-medium text-primary">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${DOTS[program.category] || "bg-primary"}`} />
                    {CATEGORIES.find(category => category.key === program.category)?.label || "Featured program"}
                  </p>
                  <h3 className="text-2xl md:text-3xl font-semibold leading-tight tracking-tight">{program.name}</h3>
                  <p className="mt-4 mb-7 line-clamp-4 text-base leading-relaxed text-muted-foreground">{program.description}</p>
                  <a href={program.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-2 self-start text-base font-medium text-primary hover:underline underline-offset-4">
                    Explore program <ExternalLink size={16} />
                  </a>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-auto right-14 top-auto bottom-0 h-11 w-11 translate-y-0 bg-muted border-0 hover:bg-primary/10" />
          <CarouselNext className="right-0 top-auto bottom-0 h-11 w-11 translate-y-0 bg-muted border-0 hover:bg-primary/10" />
        </Carousel>
      </div>
    </section>
  );
}
