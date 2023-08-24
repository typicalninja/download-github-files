import { Flex, TextInput, Button, Title, Divider, Text } from "@mantine/core";
// icons
import { BsCloudDownload } from "react-icons/bs";
import {  AiFillStar } from "react-icons/ai";
import { GoRepo } from "react-icons/go";
import { BiCookie } from "react-icons/bi"

import { links } from "../lib/constants";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { SettingsManager as settings } from "../lib/Settings";
import * as UmamiManager from "../lib/Umami";

export default function Index() {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: {
      directoryLink: "",
    },
  });

  const onSubmit = (values: { directoryLink: string }) => {
    settings.setSetting("lastDirectory", values.directoryLink);
    // analytics
    UmamiManager.sendEvent('download-as-button', { repo: values.directoryLink })

    navigate(`/d?resolve=${values.directoryLink}`);
  };


  const openGithub = () => {
    UmamiManager.sendEvent('view-repository-button', {})
    window.open(links.sourceRepo)
  }

  useEffect(() => {
    // register a pageView
    UmamiManager.pageView();
    const savedDir = settings.getSetting('lastDirectory');
    if (savedDir) form.setValues({ directoryLink: savedDir });
    // in index check for github token and if not found suggest it
    const ghToken = settings.getSetting('token')
    const lastSuggestion = settings.getSetting('tokenSuggestion')
    const analytics = settings.getSetting('analytics')

    if(!analytics && analytics === null) {
      notifications.show({
        title: "Analytics",
        message: `This program may collect analytics data for informational purposes. You can disable them in the settings`,
        id: "privacyNotification",
        color: 'yellow',
        icon: <BiCookie />,
        autoClose: false,
      });

      settings.setSetting('analytics', true)
    }

    if (!ghToken) {
      if(lastSuggestion && (lastSuggestion + (600000)) > Date.now()) return;
      settings.setSetting('tokenSuggestion', Date.now());
      notifications.show({
        title: "Access Private repositories & Higher downloads limits",
        message: `If you want higher downloads limits & access to private repositories, add a Github token using the cog wheel in the header`,
        id: "requestTokenNotification",
        autoClose: false,
      });
      // little bit of promotion
      notifications.show({
        title: "Give us a star ⭐",
        message: `If you like this project please give us a star ⭐ on our github page!`,
        id: "starNotification",
        color: 'yellow',
        icon: <AiFillStar />
      });
    }
    // disable since, form changes when you type in the input, resulting in directoryLink Not changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Flex
      mih={200}
      gap="lg"
      justify="center"
      align="center"
      direction="column"
      m={5}
    >
      <Title>Download Directories from any* Github repository</Title>
      <Title order={5}>
        Effortlessly and swiftly download{" "}
        <Text span c="teal">
          individual
        </Text>{" "}
        directories from{" "}
        <Text span c="blue" inherit fw={500}>
          {" "}
          Github{" "}
        </Text>{" "}
        in a snap. Download the specific content you need without any hassle.
      </Title>
      <Divider />
      <form onSubmit={form.onSubmit(onSubmit)}>
        <TextInput
          placeholder="https://github.com/username/repo/blob/main/file.png"
          label="Directory Link"
          size="md"
          width={20}
          withAsterisk
          required
          {...form.getInputProps("directoryLink")}
        />
        <Flex gap="md" mt={10}>
          <Button
            type="submit"
            leftIcon={<BsCloudDownload />}
            variant="light"
            color="violet"
            radius="xs"
            size="md"
          >
            Download directory
          </Button>
          <Button
            onClick={openGithub}
            leftIcon={<GoRepo />}
            variant="outline"
            color="teal"
            radius="xs"
            size="md"
          >
            Github page
          </Button>
        </Flex>
      </form>
      <Text fz="xs" c="red">
        * Requires a custom token for private repositories
      </Text>
    </Flex>
  );
}
