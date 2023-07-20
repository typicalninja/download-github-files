import { Outlet } from "react-router-dom";
import { AppShell } from '@mantine/core';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Root() {
  return (
    <AppShell
    padding="md"
    header={<Header />}
    footer={<Footer />}
    styles={(theme) => ({
        main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[0] },
      })}
  >
    <Outlet />
  </AppShell>
  )
}