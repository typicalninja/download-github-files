import { Anchor, Divider, Flex, TextInput, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { AiFillGithub } from "react-icons/ai";

export default function SettingsDrawer() {
  const [token, setToken] = useState('');


  const updateToken = (event: React.ChangeEvent<HTMLInputElement>) => {
    setToken(event.currentTarget.value)
    localStorage.setItem('requestToken', event.currentTarget.value);
  }

  useEffect(() => {
    const lsToken = localStorage.getItem('requestToken');
    if(lsToken) setToken(lsToken)
  }, [])

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
      <Text c="yellow.6" fz="sm" fw={700}>Updating this value requires a full page refresh to take effect</Text>
      <Anchor href="https://github.com/settings/tokens/new?description=Download%20Github%20Files&scopes=repo">
        Click here to generate a token
      </Anchor>
      <Divider />
    </Flex>
  );
}
