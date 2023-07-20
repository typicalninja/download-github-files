import { ActionIcon, Header, Group, Text, useMantineColorScheme } from '@mantine/core';
import { BsMoonStars, BsSun, BsFolderFill } from 'react-icons/bs'
import { Link } from 'react-router-dom';

export default function HeaderComponent() {
    // wt, idk
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { colorScheme, toggleColorScheme } = useMantineColorScheme();
    return (
        <Header height={60} p="xs">
            <Group sx={{ height: '100%' }} px={20} position="apart">
                <Link to="/"><Text><BsFolderFill /> GhFetch</Text></Link>
                <ActionIcon variant="default"  onClick={() => toggleColorScheme()} size={30}>
                {colorScheme === 'dark' ? <BsSun /> : <BsMoonStars size="1rem" />}
                </ActionIcon>
            </Group>
        </Header>
    )
}