// Portfolio content.
//
// Regions are rendered in this order: projects, professional, hackathon.
// Within a region, entries render in array order.
//
// Each entry:
//   slug        unique id, used for /portfolio/:slug
//   title       display name
//   subtitle    short role / tagline line under the title
//   region      'projects' | 'professional' | 'hackathon'
//   summary     one-paragraph blurb shown in the gallery and detail hero
//   highlights  bullet list for the detail page
//   tech        stack tags
//   links       [{ label, url }] external links (may be empty)
//   date        display date
//   contributors optional collaboration note
//   awards      optional list of short award strings
//   media       { hero, gallery: [], video } -> paths under /img or null
//   pending     optional note rendered in the detail page (e.g. media TBD)

module.exports = [
  // ------------------------------------------------------------------ projects
  {
    slug: 'paid-llm-gateway',
    title: 'Paid LLM Inference Gateway',
    subtitle: 'Metered, pay-as-you-go inference',
    region: 'projects',
    date: 'September 2026',
    summary:
      'A single Go binary that adds pay-as-you-go billing to a self-hosted Ollama instance. Accounts are funded with USDC over the x402 payment protocol, and usage is settled off-chain in Postgres.',
    highlights: [
      'Proxies the whole Ollama HTTP API (native NDJSON and OpenAI-compatible SSE) behind an authenticated wildcard reverse proxy that passes methods, paths, headers, and streaming bytes through unchanged.',
      'Funds prepaid USDC balances over x402. The first request comes back 402 Payment Required with the exact price, then the gateway verifies and settles the on-chain payment through Coinbase\'s CDP facilitator on Base.',
      'Meters with a reserve-then-settle flow: cap the requested output, reserve the worst-case cost before calling Ollama, then bill the exact usage reported and release the rest.',
      'Keeps an off-chain Postgres ledger that credits balances and records every usage transaction.',
      'Invite-only API keys stored only as SHA-256 digests, per-key rate and concurrency limits, and an admin CLI for user management and settlement reconciliation.',
    ],
    tech: ['Go', 'x402', 'USDC / Base', 'PostgreSQL', 'Ollama', 'systemd'],
    links: [{ label: 'GitHub', url: 'https://github.com/farsoudi/payed-llm-inference-gateway' }],
    media: {
      hero: '/img/portfolio/paid-llm-gateway/logo.png',
      gallery: ['/img/portfolio/paid-llm-gateway/logo.png'],
      video: null,
      contain: true,
    },
  },

  {
    slug: 'fpga-street-fighter',
    title: 'FPGA Street Fighter',
    subtitle: 'Two-player fighting game in Verilog',
    region: 'projects',
    date: 'April 2025',
    summary:
      'A two-player Street Fighter style game written in Verilog and synthesized onto a Nexys A7 FPGA, played with custom breadboard controllers and rendered over VGA.',
    highlights: [
      'Wrote the game engine: AABB collision, edge-triggered attack resolution so a held button cannot double-hit, movement and arena bounds, and the win/game-over state machine.',
      'Stored each player in one one-hot 7-bit register (facing direction plus a 6-bit action) that both the combat and sprite-selection logic read directly, so there is no second decode stage.',
      'Built a parameterized sub-second timer with a halfway flag, and reused it as-is for the jump arc and the punch cooldown.',
      'Derived several slow clock domains (movement ~125 Hz, shield drain 2 Hz, animation) from one 100 MHz input without a PLL or MMCM.',
      'Merged four nearly identical per-sprite ROM modules into one parameterized sprite_map module, and added the horizontal pixel mirroring for flipped sprites.',
      'Wrote png_to_mem / mem_to_png Python tools to convert and visually debug sprite ROMs, and debugged on real hardware through seven-plus committed bitfiles.',
    ],
    tech: ['Verilog', 'Xilinx Vivado', 'Nexys A7', 'VGA', 'Python', 'Breadboard hardware'],
    links: [
      { label: 'GitHub', url: 'https://github.com/Lukeaalbert/FPGA-street-fighter' },
    ],
    contributors:
      'Built with Luke Albert. Luke owned the VGA display and controller I/O. I owned the game and simulation layer: player state, collision, combat resolution, health/shield bookkeeping, and win conditions. We wrote the health/shield bars and the sprite pipeline together.',
    media: {
      hero: '/img/portfolio/fpga-street-fighter/cover.jpg',
      gallery: [
        '/img/portfolio/fpga-street-fighter/setup.jpg',
        '/img/portfolio/fpga-street-fighter/controller.jpg',
        '/img/portfolio/fpga-street-fighter/coding.jpg',
        { type: 'video', src: '/img/portfolio/fpga-street-fighter/gameplay.mp4' },
      ],
      video: '/img/portfolio/fpga-street-fighter/demo.mp4',
    },
  },

  {
    slug: 'self-hosted-ai-stack',
    title: 'Self-Hosted AI Stack',
    subtitle: 'Private inference, RAG, and automation',
    region: 'projects',
    date: 'August 2026',
    summary:
      'A private AI stack on a headless RTX 3090 server, reachable only over Tailscale. Local inference, chat UI, retrieval, cross-device memory, and workflow automation, with no cloud LLM involved.',
    highlights: [
      'Ollama serving 14B to 47B models, tuned to a 32K context with Flash Attention and a q8_0 KV cache (~19 GB of 24 GB VRAM), and load-tested on ~30K-token agent sessions.',
      'LibreChat in Docker pointed at a custom multi-model Ollama endpoint, with self-hosted SearXNG search, MCP tooling, and MongoDB, Meilisearch, and pgvector backing conversations, search, and RAG.',
      'A cross-device memory and document service (FastAPI, SQLite FTS5, 768-dim nomic-embed-text embeddings) with reciprocal-rank-fusion hybrid search, an async embedding queue, and an incognito mode. It is exposed to any machine as agent skills.',
      'An n8n and Postgres email agent that pulls mail from Gmail, classifies it with the LLM, extracts deadlines, and syncs to Google Calendar and Tasks only after approval. A headless Brightspace notifier feeds the same LLM.',
      'Everything stays on the tailnet. Nothing is exposed to the public internet.',
    ],
    tech: ['Ollama', 'Docker', 'LibreChat', 'pgvector', 'MongoDB', 'Meilisearch', 'FastAPI', 'SQLite / FTS5', 'n8n', 'Tailscale'],
    links: [],
    media: {
      hero: '/img/portfolio/self-hosted-ai-stack/logo.png',
      gallery: ['/img/portfolio/self-hosted-ai-stack/logo.png'],
      video: null,
      contain: true,
    },
  },

  {
    slug: 'garage-opener',
    title: 'Garage Opener',
    subtitle: 'ESP32 + React Native door control',
    region: 'projects',
    date: 'July 2023',
    summary:
      'An ESP32 garage-door controller with a companion React Native app. Open doors remotely and get a haptic confirmation on your phone.',
    highlights: [
      'ESP32 firmware (ESP-IDF, C) running an HTTP server that drives the garage relays, with standalone HTML pages as fallbacks.',
      'Expo / React Native app with a multi-door UI, an abortable API layer (AbortController), loading and error states, and different haptics for success and taps.',
      'A hardened build calls a backend behind ngrok with an auth-token header.',
      'A WebSocket control channel for the browser clients.',
    ],
    tech: ['ESP32 / ESP-IDF', 'C', 'React Native', 'Expo', 'HTML', 'WebSockets'],
    links: [],
    pending: 'Source is being published to GitHub.',
    media: {
      hero: '/img/portfolio/garage-opener/hardware.jpg',
      gallery: ['/img/portfolio/garage-opener/hardware.jpg'],
      video: null,
    },
  },

  {
    slug: 'sctennis',
    title: 'ScTennis',
    subtitle: 'Go REST backend for a tennis app',
    region: 'projects',
    date: 'January 2026',
    summary:
      'A Go backend for a tennis club app: a REST API with JWT auth and type-safe SQL generated by sqlc, laid out one file per entity.',
    highlights: [
      'REST API split one file per entity (users, login, events, profiles), each with its own middleware.',
      'A JWT auth package with its own endpoints and token handling.',
      'Type-safe database access generated by sqlc from hand-written SQL.',
    ],
    tech: ['Go', 'sqlc', 'SQL', 'JWT', 'REST'],
    links: [{ label: 'GitHub', url: 'https://github.com/farsoudi/sctennis' }],
    media: {
      hero: '/img/portfolio/sctennis/logo.png',
      gallery: ['/img/portfolio/sctennis/logo.png'],
      video: null,
      contain: true,
    },
  },

  {
    slug: 'study-spot',
    title: 'Study Spot',
    subtitle: 'Geolocated study-spot finder for USC',
    region: 'projects',
    date: 'December 2025',
    summary:
      'A geolocation study-spot finder for USC. Find, rate, and review study spots within 10 miles of campus, down to a specific room.',
    highlights: [
      'Backend service that finds study spots by location and handles ratings and feedback.',
      'Interactive Leaflet map of nearby spots.',
      'USC CSCI 201 team project; I led the backend.',
    ],
    tech: ['JavaScript', 'Java', 'Leaflet', 'HTML / CSS'],
    links: [{ label: 'GitHub', url: 'https://github.com/farsoudi/201-final-project' }],
    media: {
      hero: '/img/portfolio/study-spot/mapview.png',
      gallery: ['/img/portfolio/study-spot/mapview.png'],
      video: null,
    },
  },

  {
    slug: 'avr-atmega328',
    title: 'AVR / ATmega328',
    subtitle: 'Bare-metal UART, Bluetooth, and SPI',
    region: 'projects',
    date: '2024',
    summary:
      'Bare-metal AVR C on an ATmega328: a hand-written UART driver, HC-05 Bluetooth setup, and SPI bring-up, with no Arduino framework.',
    highlights: [
      'Interrupt-driven UART with a receive-line buffer and separate data/command baud rates.',
      'A bt_configurer program that sends AT commands and parses the OK responses to configure an HC-05 module.',
      'A bt_mega program that drives buttons and LEDs over the Bluetooth link, plus an SPI implementation (spi.c/spi.h).',
      'Direct register, DDR, and PORT manipulation and ISRs, built with hand-written Makefiles.',
    ],
    tech: ['C', 'AVR (ATmega328)', 'USART', 'SPI', 'HC-05', 'avr-gcc / Make'],
    links: [],
    media: {
      hero: '/img/portfolio/avr-atmega328/photo.jpg',
      gallery: ['/img/portfolio/avr-atmega328/photo.jpg'],
      video: '/img/portfolio/avr-atmega328/demo.mp4',
    },
  },

  // -------------------------------------------------------------- professional
  {
    slug: 'brake-performance',
    title: 'Brake Performance',
    subtitle: 'Full-Stack Software Engineer, Jul 2023 - Present, Los Angeles',
    region: 'professional',
    date: 'Jul 2023 - Present',
    summary:
      'Engineer at an e-commerce platform selling automotive brakes, working across a Symfony / API Platform API, a Next.js storefront, and a React Admin backoffice.',
    highlights: [
      'Shipped Apple Pay end to end: payment-session handling in Next.js and charge processing in Symfony/PHP. It now accounts for about 20% of sales.',
      'Built a fraud-detection engine that checks new orders against flagged ones in MySQL.',
      'Wrote an AWS Linux cron job that pulls in UPS and USPS shipment data and updates order status.',
      'Built a full-stack sales-report system (API Platform + React Admin) with day, month, and year revenue breakdowns by order, part, and product.',
      'Built a reusable transactional email system for wholesale approvals, shipment errors, and fraud alerts, with logging that keeps a failed send from blocking an order.',
    ],
    tech: ['PHP', 'Symfony', 'API Platform', 'Next.js', 'React Admin', 'MySQL', 'AWS'],
    links: [],
    media: {
      hero: '/img/portfolio/brake-performance/logo.png',
      gallery: ['/img/portfolio/brake-performance/logo.png'],
      video: null,
      contain: true,
    },
  },

  {
    slug: 'i-safe',
    title: 'I-Safe',
    subtitle: 'Junior Software Engineer (Lead Frontend), Oct 2022 - Jul 2023, Carlsbad, CA',
    region: 'professional',
    date: 'Oct 2022 - Jul 2023',
    summary:
      'Frontend work on a cross-platform document-signing app built in React Native.',
    highlights: [
      'Built the frontend logic for 25+ REST endpoints in TypeScript on React Native.',
      'Designed the Redux state layer, including user-data storage and syncing it to the React lifecycle.',
      'Integrated Redux-Saga middleware for API calls and async data flow into client-side storage.',
      'Built the whole login and authorization flow, including token-based auth with refresh logic.',
      'Built custom document-signing components for Android and iOS.',
    ],
    tech: ['React Native', 'TypeScript', 'Redux', 'Redux-Saga', 'REST'],
    links: [],
    media: {
      hero: '/img/portfolio/i-safe/logo.png',
      gallery: ['/img/portfolio/i-safe/logo.png'],
      video: null,
      contain: true,
    },
  },

  // ----------------------------------------------------------------- hackathon
  {
    slug: 'myhealth',
    title: 'myHealth',
    subtitle: 'SDSU Big Data Hackathon 2022: 1st place in Geocomputational Thinking, 3rd overall',
    region: 'hackathon',
    date: 'October 2022',
    summary:
      'An app that warns university students about health risks on campus, built for the 2022 SDSU Big Data Hackathon.',
    highlights: [
      'Led the project and built most of it myself, including the whole backend.',
      'Express server with MySQL, session-based auth, and Vonage SMS notifications.',
      'EJS-rendered views, with an MD5 helper for session hashing.',
      'Won first place in Geocomputational Thinking and third overall at the school hackathon.',
    ],
    tech: ['Node.js', 'Express', 'MySQL', 'EJS', 'Vonage SMS'],
    links: [{ label: 'GitHub', url: 'https://github.com/farsoudi/myHealth' }],
    awards: ['1st place, Geocomputational Thinking', '3rd place overall'],
    media: {
      hero: '/img/portfolio/myhealth/proposal.png',
      gallery: ['/img/portfolio/myhealth/proposal.png'],
      video: null,
    },
  },
];
