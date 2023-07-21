import { Anchor, Divider, Flex, TextInput, Text, Select } from "@mantine/core";
import { useEffect, useState } from "react";
import { AiFillGithub } from "react-icons/ai";
import { type DownloaderSettings, SettingsManager as settings } from "../lib/Settings";

export default function SettingsDrawer() {
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<string | null>("");

  const updateToken = (event: React.ChangeEvent<HTMLInputElement>) => {
    setToken(event.currentTarget.value);
    settings.setSetting<"token">("token", event.currentTarget.value);
  };

  const updateMode = (mode: string) => {
    setMode(mode) 
    settings.setSetting("downloaderMode", mode as DownloaderSettings['downloaderMode']);
  }

  useEffect(() => {
    const lsToken = settings.getSetting("token");
    if (lsToken) setToken(lsToken);
    const mode = settings.getSetting("downloaderMode");
    if(mode) setMode(mode)
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
      <Text c="yellow.6" fz="sm" fw={700}>
        Updating this value requires a full page refresh to take effect
      </Text>
      <Anchor href="https://github.com/settings/tokens/new?description=Download%20Github%20Files&scopes=repo">
        Click here to generate a token
      </Anchor>
      <Divider />
      <Select
        label="Downloader Mode"
        placeholder="Choose the mode of the downloader"
        onChange={updateMode}
        value={mode}
        data={[
          { value: "autoFetch", label: "Fetch repo and File List" },
          { value: "autoFetchAnDownload", label: "Fetch repo and Download Files" },
          { value: "autoSave", label: "Fetch Repo and Download & Save Files" },
        ]}
      />
      <Text c="teal.6" fz="sm" fw={700}>This modifies how the downloader will work, for most the default setting would work</Text>
      <Divider />
    </Flex>
  );
}
