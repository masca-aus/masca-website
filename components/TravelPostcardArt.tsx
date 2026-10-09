type Subject = "food" | "towers" | "tea" | "borneo" | "opera" | "reef";

// Small, decorative vector postcards: no image requests or client JavaScript.
export default function TravelPostcardArt({ subject }: { subject: Subject }) {
  return (
    <svg viewBox="0 0 260 180" fill="none" aria-hidden="true" focusable="false">
      {subject === "opera" && (
        <g stroke="#010066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="196" cy="48" r="23" fill="#FFCC00" stroke="none" />
          <path d="M34 143h190l-12 9H47Z" fill="#C5AC88" />
          <path d="M48 134h161v9H48Z" fill="#E5E5F0" />
          <path d="M59 134C48 112 43 94 44 77c29 8 52 26 67 57Z" fill="#FFFDF5" />
          <path d="M87 134C64 101 59 76 61 50c45 21 68 47 75 84Z" fill="#FFFDF5" />
          <path d="M126 134C97 89 92 54 99 25c44 28 63 66 65 109Z" fill="#FFFDF5" />
          <path d="M144 134c9-29 30-51 56-60-1 25-10 44-25 60Z" fill="#FFFDF5" />
          <path d="M179 134c10-16 26-25 43-28-2 12-6 20-13 28Z" fill="#FFFDF5" />
          <path d="m61 50 56 84M99 25l46 109m55-60-41 60M44 77l39 57m139-28-26 28" stroke="#C8C7D5" strokeWidth="1.5" />
          <path d="M37 160q10-6 20 0t20 0t20 0m44 0q10-6 20 0t20 0t20 0" stroke="#477080" />
          <path d="M151 46q6-8 12 0m-6 12q6-8 12 0" />
        </g>
      )}
      {subject === "reef" && (
        <g stroke="#010066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M38 151c45-12 99 11 183-2" stroke="#477080" />
          <path d="M65 149v-37m0 19-14-11v-13m14 13 14-12V98m-14 20-9-11V96" stroke="#CC0001" strokeWidth="7" />
          <path d="M193 148v-39m0 25-12-12v-12m12 13 12-13V98" stroke="#B9793D" strokeWidth="7" />
          <path d="M101 148c-12-17-20-11-15-1m17 2c-3-28 10-34 13-9m-5 9c15-22 28-11 15 0" fill="#80A77D" />
          <path d="M113 58c-18-27-32-27-32-17 1 10 14 22 26 26m38 23c8 22 27 22 30 14 2-7-13-17-24-21" fill="#80A77D" />
          <path d="M105 84c-21 6-26 21-16 22 11 1 22-11 26-17m27-33c7-14 18-15 22-11 4 5-6 15-13 19" fill="#80A77D" />
          <ellipse cx="162" cy="66" rx="15" ry="12" fill="#B6CE91" transform="rotate(-15 162 66)" />
          <ellipse cx="125" cy="73" rx="32" ry="24" fill="#80A77D" transform="rotate(-15 125 73)" />
          <path d="m113 62 17-4 11 11-5 15-18 4-11-12Z" fill="#B6CE91" strokeWidth="1.5" />
          <path d="m113 62-8-7m25 3 4-9m7 20 15-3m-20 18 10 8m-28-4-2 8m-9-20-13 3" strokeWidth="1.5" />
          <circle cx="168" cy="63" r="1.5" fill="#010066" stroke="none" />
          <path d="M182 91q14-14 26 0-12 14-26 0Zm26 0 9-8v16Z" fill="#FFCC00" />
          <circle cx="188" cy="90" r="1.5" fill="#010066" stroke="none" />
          <circle cx="71" cy="65" r="4" stroke="#477080" />
          <circle cx="80" cy="51" r="2" stroke="#477080" />
          <circle cx="193" cy="44" r="5" stroke="#477080" />
        </g>
      )}
      {subject === "food" && (
        <g stroke="#010066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="130" cy="137" rx="88" ry="15" fill="#010066" opacity=".08" stroke="none" />
          <ellipse cx="130" cy="104" rx="94" ry="49" fill="#FFFDF5" />
          <path d="M50 100 154 62 212 115 111 144Z" fill="#80A77D" />
          <path d="m61 104 138 14M96 91l19 48m20-61 17 54m17-39 11 27" stroke="#436F54" strokeWidth="1.5" />
          <path d="M92 102c0-27 13-44 35-44s36 17 36 44c-13 14-57 15-71 0Z" fill="#FFFEF4" />
          <path d="m111 83 3-5m11 15 2-5m13-14 3 4m-28 16 2 3m31-5 2 4" stroke="#C6BEA5" strokeWidth="2" />
          <path d="M153 118c-6-13 7-26 21-24 10-8 23 1 22 11 9 9-2 22-16 18-12 6-23 2-27-5Z" fill="#CC0001" />
          <ellipse cx="83" cy="109" rx="17" ry="12" fill="#B6CE91" transform="rotate(-28 83 109)" />
          <ellipse cx="81" cy="99" rx="17" ry="12" fill="#D4E5B3" transform="rotate(-28 81 99)" />
          <path d="m75 97 10 4m-6-8 1 10" stroke="#80A77D" />
          <ellipse cx="175" cy="79" rx="21" ry="17" fill="#FFFEF4" transform="rotate(24 175 79)" />
          <circle cx="175" cy="79" r="9" fill="#FFCC00" stroke="none" />
          <g fill="#B9793D" strokeWidth="1.5">
            <ellipse cx="111" cy="123" rx="5" ry="3" transform="rotate(30 111 123)" />
            <ellipse cx="124" cy="126" rx="5" ry="3" transform="rotate(-20 124 126)" />
            <ellipse cx="136" cy="120" rx="5" ry="3" transform="rotate(45 136 120)" />
          </g>
          <path d="m68 42 4-7m133 12 7-3m-20-9 2-8" stroke="#CC0001" />
        </g>
      )}
      {subject === "towers" && (
        <g stroke="#010066" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="176" cy="49" r="27" fill="#FFCC00" stroke="none" />
          <path d="M46 148h168" />
          {[79, 147].map((x) => (
            <g key={x}>
              <path d={`M${x} 148V84h4V62h5V47h7V35h6v12h7v15h5v22h4v64Z`} fill="#E5E5F0" />
              <path d={`M${x + 19} 35V17m-5 18h10M${x + 7} 84h24M${x + 9} 62h20`} />
              {[91, 100, 109, 118, 127, 136].map((y) => <path key={y} d={`M${x} ${y}h38`} />)}
              <path d={`M${x + 12} 85v63m14-63v63M${x + 15} 48v35m9-35v35`} strokeWidth="1" />
            </g>
          ))}
          <path d="M117 91h30v9h-30Z" fill="#FFFEF4" />
          <path d="m119 111 13-11 13 11M49 70q7-9 14 0m-3-22q6-8 12 0" />
          <path d="M39 148c-3-16 12-23 19-10 7-20 22-13 22 10m108 0c0-14 10-21 17-11 9-10 20-2 18 11" fill="#80A77D" />
        </g>
      )}
      {subject === "tea" && (
        <g stroke="#010066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="145" cy="153" rx="61" ry="9" fill="#010066" opacity=".08" stroke="none" />
          <path d="M114 101h61l-5 43c-1 12-47 12-50 0Z" fill="#D69D61" />
          <path d="M175 108h11c18 0 17 28-3 28h-11m3-20h9c7 0 6 12-1 12h-9" fill="#FFFDF5" />
          <ellipse cx="144.5" cy="101" rx="30.5" ry="8" fill="#FFF0D8" />
          <path d="M130 115v25m12-24v25m13-26-1 25" stroke="#F4CA92" strokeWidth="3" />
          <g transform="rotate(-28 94 50)">
            <path d="M67 28h51l-5 44c-12 7-29 7-40 0Z" fill="#E5E5F0" />
            <path d="M67 36H56c-15 0-13 25 2 25h13m-3-18h-9c-5 0-4 11 1 11h10" fill="#FFFDF5" />
            <ellipse cx="92.5" cy="28" rx="25.5" ry="6" fill="#D69D61" />
          </g>
          <path d="M116 39c31 10 7 36 29 60" stroke="#B9793D" strokeWidth="8" />
          <path d="M115 39c30 12 7 35 29 58" stroke="#F4CA92" strokeWidth="3" />
          <path d="m175 57 5-9m5 24 11-3m-40-30 1-10" stroke="#CC0001" />
          <circle cx="136" cy="100" r="2" fill="#FFFDF5" stroke="none" />
          <circle cx="151" cy="102" r="3" fill="#FFFDF5" stroke="none" />
        </g>
      )}
      {subject === "borneo" && (
        <g stroke="#010066" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="181" cy="46" r="23" fill="#FFCC00" stroke="none" />
          <path d="M46 40c57 6 91-5 173 1" stroke="#826649" strokeWidth="9" />
          <path d="M51 40C37 15 61 12 79 37 79 9 106 20 87 39" fill="#80A77D" />
          <path d="M196 41c-6 20 15 27 19 2" fill="#80A77D" />
          <path d="M116 101C78 105 65 81 77 42m68 55c35-4 37-28 27-55" stroke="#B96539" strokeWidth="18" />
          <path d="M105 125c-7 17-14 20-21 17m58-17c7 17 14 20 21 17" stroke="#B96539" strokeWidth="15" />
          <ellipse cx="124" cy="109" rx="31" ry="33" fill="#B96539" />
          <circle cx="124" cy="77" r="30" fill="#B96539" />
          <path d="M104 76c-2-17 18-18 20-6 5-13 23-10 20 5 12 24-31 39-40 13Z" fill="#F0C6A0" />
          <path d="M113 78h1m20 0h1m-17 14q7 5 13-1" />
          <path d="M64 155c-18-36-31-30-25-9 4 11 12 17 25 17-9-27 12-39 18-14m117 8c-5-34 18-42 21-18-1 13-11 19-21 23 18-9 34-5 29 5" fill="#80A77D" />
        </g>
      )}
    </svg>
  );
}
