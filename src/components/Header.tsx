import {
  ActionIcon,
  Header,
  Group,
  Text,
  useMantineColorScheme,
  Drawer,
  Flex,
} from "@mantine/core";

import { BsMoonStars, BsSun, BsFolderFill } from "react-icons/bs";
import { BiSolidCog } from "react-icons/bi"

import { Link } from "react-router-dom";
import SettingsDrawer from "./SettingsDrawer";
import { useDisclosure } from "@mantine/hooks";

export default function HeaderComponent() {
  const [DrawerOpen, { open, close }] = useDisclosure(false);
  // wt, idk
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  return (
    <Header height={60} p="xs">
      <Drawer
        opened={DrawerOpen}
        onClose={close}
        title="Downloader Settings"
        overlayProps={{ opacity: 0.5, blur: 4 }}
      >
        <SettingsDrawer />
      </Drawer>
      <Group sx={{ height: "100%" }} px={20} position="apart">
        <Link to="/">
          <Text>
            <BsFolderFill /> download-github-files
          </Text>
        </Link>
        <Flex gap="xs">
        <ActionIcon
          variant="default"
          onClick={() => toggleColorScheme()}
          size={30}
        >
          {colorScheme === "dark" ? <BsSun /> : <BsMoonStars />}
        </ActionIcon>
        <ActionIcon
          variant="light"
          color="grape"
          onClick={() => open()}
          size={30}
        >
            <BiSolidCog />
        </ActionIcon>
        </Flex>
      </Group>
    </Header>
  );
}
