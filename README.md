## License

The **source code** in this repository is licensed under the [MIT License](./LICENSE).
You're welcome to use it as a starting point for your own project.

The **MASCA name, logo, branding, and written content** are **not** covered by
the MIT License and remain the property of MASCA. Please don't reuse them to
represent or imply affiliation with your own organisation.

## ⚙️ Getting Started

Follow these steps to set up and run the application locally.

### Prerequisites

- Node.js 22 LTS (run `nvm use` if you use nvm)
- npm 11 (the version is pinned in `package.json`)

Enable the pinned package manager once after installing Node:

```bash
corepack enable
corepack install
```

### 1. Clone the Repository

```bash
git clone https://github.com
cd your-repo-name
```

### 2. Install Dependencies

Install the exact dependency versions recorded in the lockfile:

```bash
npm ci
```

### 3. Environment Variables

Create a copy of the template environment file and update the variables with your local secrets. Do **not** commit actual keys to your Git repository.

```bash
cp .env.example .env.local
```

Open `.env.local` and populate the necessary parameters. (ask Jin or the owner for this)

### 4. Run the Development Server

Start the application locally on [http://localhost:3000](http://localhost:3000):

```bash
npm run dev
```
