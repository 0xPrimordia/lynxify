**React + TypeScript + Vite**

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

@vitejs/plugin-react uses Babel for Fast Refresh
@vitejs/plugin-react-swc uses SWC for Fast Refresh
Expanding the ESLint configuration
If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

Configure the top-level parserOptions property like this:
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
Replace plugin:@typescript-eslint/recommended to plugin:@typescript-eslint/recommended-type-checked or plugin:@typescript-eslint/strict-type-checked
Optionally add plugin:@typescript-eslint/stylistic-type-checked
Install eslint-plugin-react and add plugin:react/recommended & plugin:react/jsx-runtime to the extends list

***
**Updates:**

**Update #1:**

Kick off starts today to get us to the prototype goals for our Hedera/L2 wallet and tunnel. As our first L2 we have selected Base and our wallet features will be done with Privy. For the Hedera side, we will be implementing the Hashport API.

**Update #2:**

Prototyped bridge using Rainbowkit & Hashport to move assets from EVM to Hedera
* Created Typescript App
* Integrated Rainbowkit & Hashport
* Debugged on testnet
* Ran locally and debugged
* Deployed test on Netlify
