import type { CaliforniaCountySummary } from "@/lib/types";

const countyPins: Record<string, { top: string; left: string }> = {
  alameda: { top: "54%", left: "42%" },
  alpine: { top: "50%", left: "66%" },
  amador: { top: "48%", left: "57%" },
  butte: { top: "29%", left: "50%" },
  calaveras: { top: "53%", left: "57%" },
  colusa: { top: "33%", left: "41%" },
  contra_costa: { top: "50%", left: "46%" },
  del_norte: { top: "7%", left: "21%" },
  el_dorado: { top: "43%", left: "60%" },
  fresno: { top: "70%", left: "55%" },
  glenn: { top: "28%", left: "41%" },
  humboldt: { top: "16%", left: "19%" },
  imperial: { top: "96%", left: "80%" },
  inyo: { top: "70%", left: "73%" },
  kern: { top: "84%", left: "61%" },
  kings: { top: "76%", left: "54%" },
  lake: { top: "35%", left: "32%" },
  lassen: { top: "17%", left: "61%" },
  los_angeles: { top: "89%", left: "60%" },
  madera: { top: "66%", left: "58%" },
  marin: { top: "47%", left: "35%" },
  mariposa: { top: "62%", left: "60%" },
  mendocino: { top: "28%", left: "25%" },
  merced: { top: "62%", left: "52%" },
  modoc: { top: "8%", left: "63%" },
  mono: { top: "58%", left: "72%" },
  monterey: { top: "70%", left: "40%" },
  napa: { top: "42%", left: "39%" },
  nevada: { top: "33%", left: "58%" },
  orange: { top: "92%", left: "65%" },
  placer: { top: "38%", left: "57%" },
  plumas: { top: "24%", left: "58%" },
  riverside: { top: "91%", left: "73%" },
  sacramento: { top: "43%", left: "50%" },
  san_benito: { top: "67%", left: "45%" },
  san_bernardino: { top: "83%", left: "76%" },
  san_diego: { top: "96%", left: "68%" },
  san_francisco: { top: "51%", left: "37%" },
  san_joaquin: { top: "53%", left: "50%" },
  san_luis_obispo: { top: "78%", left: "43%" },
  san_mateo: { top: "57%", left: "38%" },
  santa_barbara: { top: "84%", left: "47%" },
  santa_clara: { top: "61%", left: "43%" },
  santa_cruz: { top: "64%", left: "39%" },
  shasta: { top: "15%", left: "45%" },
  sierra: { top: "29%", left: "62%" },
  siskiyou: { top: "7%", left: "42%" },
  solano: { top: "47%", left: "43%" },
  sonoma: { top: "42%", left: "32%" },
  stanislaus: { top: "58%", left: "51%" },
  sutter: { top: "36%", left: "47%" },
  tehama: { top: "22%", left: "43%" },
  trinity: { top: "16%", left: "32%" },
  tulare: { top: "78%", left: "60%" },
  tuolumne: { top: "57%", left: "61%" },
  ventura: { top: "87%", left: "53%" },
  yolo: { top: "40%", left: "43%" },
  yuba: { top: "33%", left: "51%" },
};

export function CaliforniaCountyPins({
  counties,
  selectedCountyName,
  large = false,
}: {
  counties: CaliforniaCountySummary[];
  selectedCountyName?: string;
  large?: boolean;
}) {
  const showLabels = counties.length <= 10;

  return (
    <div className={large ? "relative min-h-[420px]" : "absolute inset-0"} aria-hidden="true">
      {counties.map((county) => {
        const position = countyPins[county.id];
        if (!position) return null;
        const active = county.name === selectedCountyName;
        const reviewed = county.coverage_level === "reviewed_local";
        return (
          <span
            key={county.id}
            className={
              active
                ? "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-blue bg-blue px-3 py-1.5 text-xs font-extrabold text-white shadow-atlas-soft before:absolute before:-top-[15px] before:left-1/2 before:h-3.5 before:w-3.5 before:-translate-x-1/2 before:rounded-full before:border-2 before:border-surface before:bg-blue before:content-['']"
                : reviewed || showLabels
                  ? "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-blue/40 bg-sky px-2 py-1 text-[11px] font-extrabold text-blue-dark shadow-atlas-soft before:absolute before:-top-[12px] before:left-1/2 before:h-2.5 before:w-2.5 before:-translate-x-1/2 before:rounded-full before:border-2 before:border-surface before:bg-blue before:content-['']"
                  : "absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface bg-blue/70 shadow-atlas-soft"
            }
            style={position}
            title={county.name}
          >
            {(active || reviewed || showLabels) && county.name.replace(" County", "")}
          </span>
        );
      })}
    </div>
  );
}
