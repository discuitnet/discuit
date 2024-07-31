import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:443',
        secure: false,
      },
      '/images': {
        target: 'https://localhost:443',
        secure: false,
      },
    },
  },
  define: {
    ...parseYamlFile()
  }
})

function parseYamlFile() {
  // const config = YAML.parse(fs.readFileSync("config.yaml", "utf-8"));
  // if (typeof config !== "object") {
  //   throw new Error("config.yaml file is not an object");
  // }

  // for (const key in config) {
  //   define[`import.meta.env.VITE_${key.toUpperCase()}`] = JSON.stringify(
  //     config[key]
  //   );
  // }

  return {
    VITE_SITENAME: '""',
    VITE_CAPTCHASITEKEY: '""',
    VITE_EMAILCONTACT: '""',
    VITE_FACEBOOKURL: '""',
    VITE_TWITTERURL: '""',
    VITE_INSTAGRAMURL: '""',
    VITE_DISCORDURL: '""',
    VITE_GITHUBURL: '""',
    VITE_SUBSTACKURL: '""',
    VITE_DISABLEIMAGEPOSTS: '""',
    VITE_DISABLEFORUMCREATION: '""',
    VITE_FORUMCREATIONREQPOINTS: '""',
    VITE_DEFAULTFEEDSORT: '""',
    VITE_MAXIMAGESPERPOST: '""',
  }
}