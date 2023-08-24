import {
  Anchor,
  Divider,
  Flex,
  TextInput,
  Text,
  Select,
  Button,
  Checkbox,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { AiFillGithub } from "react-icons/ai";
import {
  type DownloaderSettings,
  SettingsManager as settings,
} from "../lib/Settings";
import { fetchCurrentTokenUser } from "../lib/github";
import { notifications } from "@mantine/notifications";

import * as UmamiManager from "../lib/Umami";

export default function SettingsDrawer() {
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<string | null>("");
  const [tokenEnabled, setTokenEnabled] = useState<boolean>(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(true);

  const updateMode = (mode: string) => {
    setMode(mode);
    settings.setSetting(
      "downloaderMode",
      mode as DownloaderSettings["downloaderMode"]
    );
  };

  const testToken = (): Promise<boolean> => {
    return new Promise((resolve) => {
      fetchCurrentTokenUser()
        .then((user) => {
          notifications.show({
            message: `Verified Token belonging to user ${user.login}`,
            title: "Successful Verification of token",
            color: "green",
            autoClose: false,
          });
          resolve(true);
        })
        .catch((err) => {
          notifications.show({
            message: `${String(err as Error)}`,
            title: "Failed Verification",
            color: "red",
            autoClose: false,
          });
          resolve(false);
        });
    });
  };

  const updateToken = (event: React.ChangeEvent<HTMLInputElement>) => {
    setToken(event.currentTarget.value);
    settings.setSetting<"token">("token", event.currentTarget.value);
  };

  const setTokenState = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked;
    setTokenEnabled(checked);
    UmamiManager.sendEvent(`token-state`, { enabled: checked })
    settings.setSetting("tokenEnabled", checked);
  };

  const toggleAnalytics = () => {
    const newState = !analyticsEnabled;
    setAnalyticsEnabled(newState);
    // just to see how many turned off, no additional data is collected
    UmamiManager.sendEvent(`analytic-state`, { enabled: newState })
    settings.setSetting("analytics", newState);
    notifications.show({
      message: `Analytics toggle`,
      title: `Analytics toggled ${
        newState ? "On" : "Off"
      }. Please wait while we reload`,
      color: newState ? "green" : "red",
    });
    setTimeout(() => {
      // hard refresh with a delay
      window.location.reload();
    }, 1000);
  };

  useEffect(() => {
    const lsToken = settings.getSetting("token");
    if (lsToken) setToken(lsToken);
    const mode = settings.getSetting("downloaderMode");
    if (mode) setMode(mode);
    const tokenE = settings.getSetting("tokenEnabled");
    if (typeof tokenE == "boolean") setTokenEnabled(tokenE);
    const analyticsEnabled = settings.getSetting("analytics");
    if (typeof analyticsEnabled === "boolean")
      setAnalyticsEnabled(analyticsEnabled);
  }, []);

  return (
    <Flex direction="column" gap="md">
      <Divider />
      <TextInput
        icon={<AiFillGithub />}
        radius="xs"
        value={token}
        onChange={updateToken}
        description="Allow higher downloads limits & access to private repositories (your), NOT Required"
        label="Github token"
      />
      <Checkbox
        label="Use Token for requests"
        checked={tokenEnabled}
        onChange={setTokenState}
      />
      <Button
        onClick={() => void testToken()}
        disabled={typeof token !== "string" || token === ""}
      >
        Test Token
      </Button>
      <Text c="yellow.6" fz="sm" fw={700}>
        Updating this value requires a full page refresh to take effect
      </Text>
      <Anchor
        target="_blank"
        href="https://github.com/settings/tokens/new?description=Download%20Github%20Files&scopes=repo"
      >
        Click here to generate a personal access token
      </Anchor>
      <Divider />
      <Select
        label="Downloader Mode"
        placeholder="Choose the mode of the downloader"
        onChange={updateMode}
        value={mode}
        data={[
          { value: "autoFetch", label: "Fetch repo and File List" },
          {
            value: "autoFetchAnDownload",
            label: "Fetch repo and Download Files",
          },
          { value: "autoSave", label: "Fetch Repo and Download & Save Files" },
        ]}
      />
      <Text c="teal.6" fz="sm" fw={700}>
        This modifies how the downloader will work, for most the default setting
        would work
      </Text>
      <Divider />
      <Checkbox
        label="Allow collection of data for analytics"
        checked={analyticsEnabled}
        onChange={toggleAnalytics}
      />
      <Text c="yellow.6" fz="sm" fw={700}>
        Disabling does not fully stop the analytics function. (Only minimal
        amount of analytics get collected)
      </Text>
      <Divider />
    </Flex>
  );
}
