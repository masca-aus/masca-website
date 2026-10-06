// Real photographs from Wikimedia Commons. Keep attribution with the assets.
export type PhotoCredit = { name: string; author: string; source: string; license: string; licenseUrl: string };
type StatePhoto = PhotoCredit & { code: string; variant: "landmark" | "university"; src: string; mobileSrc: string; position: string; mobileCredit?: PhotoCredit };
export const stateLandmarks: readonly StatePhoto[] = [
  {
    "code": "NSW",
    "name": "Sydney Harbour and Opera House at dusk",
    "src": "/images/state-landmarks/nsw-hero.webp",
    "position": "center center",
    "author": "DAVID ILIFF",
    "source": "https://commons.wikimedia.org/wiki/File:Sydney_skyline_at_dusk_-_Dec_2008.jpg",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "variant": "landmark",
    "mobileSrc": "/images/state-landmarks/nsw-hero-mobile.webp",
    "mobileCredit": {
      "name": "Sydney Opera House from the ferry (mobile)",
      "author": "Marcello Gamez",
      "source": "https://commons.wikimedia.org/wiki/File:Ferry_Views.jpg",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
    }
  },
  {
    "code": "VIC",
    "name": "Melbourne and the Yarra River at dusk",
    "src": "/images/state-landmarks/vic-hero.webp",
    "position": "center center",
    "author": "Chris Phutully from Australia",
    "source": "https://commons.wikimedia.org/wiki/File:Dusk_over_City_of_Melbourne_(9534781183)_(2).jpg",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "variant": "landmark",
    "mobileSrc": "/images/state-landmarks/vic-hero-mobile.webp"
  },
  {
    "code": "QLD",
    "name": "Story Bridge and Brisbane skyline at dusk",
    "src": "/images/state-landmarks/qld-hero.webp",
    "position": "center center",
    "author": "John from Redcliffe, Australia",
    "source": "https://commons.wikimedia.org/wiki/File:Brisbane_Story_Bridge_at_dusk-2%3D_(25827125674).jpg",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "variant": "landmark",
    "mobileSrc": "/images/state-landmarks/qld-hero-mobile.webp"
  },
  {
    "code": "WA",
    "name": "Elizabeth Quay and Perth skyline",
    "src": "/images/state-landmarks/wa-hero.webp",
    "position": "center center",
    "author": "Pedro Szekely from Los Angeles, USA",
    "source": "https://commons.wikimedia.org/wiki/File:Perth_(33598468020).jpg",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "variant": "landmark",
    "mobileSrc": "/images/state-landmarks/wa-hero-mobile.webp"
  },
  {
    "code": "SA",
    "name": "Adelaide skyline across the River Torrens",
    "src": "/images/state-landmarks/sa-hero.webp",
    "position": "center center",
    "author": "Lasse B. from Deutschland",
    "source": "https://commons.wikimedia.org/wiki/File:Skyline_Adelaide_at_Night_(27381876472).jpg",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "variant": "landmark",
    "mobileSrc": "/images/state-landmarks/sa-hero-mobile.webp"
  },
  {
    "code": "ACT",
    "name": "Parliament House at dusk",
    "src": "/images/state-landmarks/act-hero.webp",
    "position": "center center",
    "author": "Thennicke",
    "source": "https://commons.wikimedia.org/wiki/File:Parliament_House_at_dusk,_Canberra_ACT.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "variant": "landmark",
    "mobileSrc": "/images/state-landmarks/act-hero-mobile.webp"
  },
  {
    "code": "TAS",
    "name": "Hobart and the Derwent from kunanyi / Mount Wellington",
    "src": "/images/state-landmarks/tas-hero.webp",
    "position": "center center",
    "author": "Christopher Neugebaeur",
    "source": "https://commons.wikimedia.org/wiki/File:Hobart_moonrise_from_Mt_Wellington.jpg",
    "license": "CC BY-SA 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "variant": "landmark",
    "mobileSrc": "/images/state-landmarks/tas-hero-mobile.webp"
  },
  {
    "code": "NSW",
    "variant": "university",
    "name": "University of Sydney — Main Quadrangle",
    "author": "Jason Tong",
    "source": "https://commons.wikimedia.org/wiki/File:The_University_of_Sydney%27s_Main_Quadrangle.jpg",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "src": "/images/state-landmarks/nsw-university.webp",
    "mobileSrc": "/images/state-landmarks/nsw-university-mobile.webp",
    "position": "center center",
    "mobileCredit": {
      "name": "University of Sydney — Main Quadrangle (mobile)",
      "author": "Sun jess",
      "source": "https://commons.wikimedia.org/wiki/File:Quadrangle,_University_of_Sydney,_April_2021.jpg",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
    }
  },
  {
    "code": "VIC",
    "variant": "university",
    "name": "University of Melbourne — Old Quadrangle",
    "author": "Sgroey",
    "source": "https://commons.wikimedia.org/wiki/File:Law_School_Building_and_Old_Quadrangle.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "src": "/images/state-landmarks/vic-university.webp",
    "mobileSrc": "/images/state-landmarks/vic-university-mobile.webp",
    "position": "center center",
    "mobileCredit": {
      "name": "University of Melbourne — Old Arts (mobile)",
      "author": "Gracchus250",
      "source": "https://commons.wikimedia.org/wiki/File:Old_Arts_Building_University_of_Melbourne_2018.jpg",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
    }
  },
  {
    "code": "QLD",
    "variant": "university",
    "name": "University of Queensland — Great Court",
    "author": "Chris Olszewski",
    "source": "https://commons.wikimedia.org/wiki/File:Steele_Building_surrounding_the_Great_Court,_University_of_Queensland.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "src": "/images/state-landmarks/qld-university.webp",
    "mobileSrc": "/images/state-landmarks/qld-university-mobile.webp",
    "position": "center center",
    "mobileCredit": {
      "name": "University of Queensland — Great Court (mobile)",
      "author": "Nick-D",
      "source": "https://commons.wikimedia.org/wiki/File:Covered_walkway_at_the_southern_edge_of_the_Great_Court_at_the_University_of_Queensland_July_2015.jpg",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
    }
  },
  {
    "code": "WA",
    "variant": "university",
    "name": "University of Western Australia — Winthrop Hall",
    "author": "Calistemon",
    "source": "https://commons.wikimedia.org/wiki/File:Winthrop_Hall,_UWA,_September_2020_03.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "src": "/images/state-landmarks/wa-university.webp",
    "mobileSrc": "/images/state-landmarks/wa-university-mobile.webp",
    "position": "center center"
  },
  {
    "code": "SA",
    "variant": "university",
    "name": "Bonython Hall — Adelaide, North Terrace campus",
    "author": "User:DXR",
    "source": "https://commons.wikimedia.org/wiki/File:Bonython_Hall,_University_of_Adelaide,_East_view_20230207.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "src": "/images/state-landmarks/sa-university.webp",
    "mobileSrc": "/images/state-landmarks/sa-university-mobile.webp",
    "position": "center center"
  },
  {
    "code": "ACT",
    "variant": "university",
    "name": "Australian National University — Hanna Neumann Building",
    "author": "Nick-D",
    "source": "https://commons.wikimedia.org/wiki/File:Hanna_Neumann_Building_June_2024.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "src": "/images/state-landmarks/act-university.webp",
    "mobileSrc": "/images/state-landmarks/act-university-mobile.webp",
    "position": "center center"
  },
  {
    "code": "TAS",
    "variant": "university",
    "name": "University of Tasmania — Centenary Building",
    "author": "Noogz",
    "source": "https://commons.wikimedia.org/wiki/File:UTAS_Centenary_Building.jpg",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "src": "/images/state-landmarks/tas-university.webp",
    "mobileSrc": "/images/state-landmarks/tas-university-mobile.webp",
    "position": "center center",
    "mobileCredit": {
      "name": "University of Tasmania — Medical Science Precinct (mobile)",
      "author": "Canley",
      "source": "https://commons.wikimedia.org/wiki/File:University_of_Tasmania_Medical_Science_Precinct_MS1.jpg",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
    }
  }
];

export const photoCredits = stateLandmarks.flatMap((photo) => [photo, ...(photo.mobileCredit ? [photo.mobileCredit] : [])]);
