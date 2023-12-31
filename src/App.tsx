import {
  MantineProvider,
  ColorSchemeProvider,
  ColorScheme,
} from "@mantine/core";

import { Notifications } from "@mantine/notifications";

import { useColorScheme, useHotkeys, useLocalStorage } from "@mantine/hooks";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

// root
import Root from "./routes/root.tsx";
// errors (404 etc)
import ErrorPage from "./error.tsx";

// index
import Index from "./routes/index.tsx";
import DownloadPage from "./routes/download.tsx";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Root />,
      errorElement: <ErrorPage />,
      children: [
        {
          path: "/",
          element: <Index />,
        },
        {
          path: "/d",
          element: <DownloadPage />,
        },
      ],
    },
  ],
  {basename: '/download-github-files'}
);

export default function App() {
  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: "user-theme-preference",
    defaultValue: preferredColorScheme,
    getInitialValueInEffect: true,
  });

  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"));

  useHotkeys([["mod+J", () => toggleColorScheme()]]);
  return (
    <ColorSchemeProvider
      colorScheme={colorScheme}
      toggleColorScheme={toggleColorScheme}
    >
      <MantineProvider
        theme={{ colorScheme }}
        withGlobalStyles
        withNormalizeCSS
      >
        <Notifications position="bottom-center" />
        <RouterProvider router={router} />
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
