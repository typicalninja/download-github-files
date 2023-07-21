import { notifications } from "@mantine/notifications";
import { AiOutlineClose, AiOutlineCheck, AiOutlineWarning } from "react-icons/ai";

export function ErrorNotification(message: string, title: string, critical: boolean) {
    notifications.show({
      message,
      title,
      icon: <AiOutlineClose />,
      color: "red",
      // if critical errors should stay visible until closed else 10s
      autoClose: critical ? false : 10000
    });
}

export function SuccessNotification(message: string, title: string, autoClose: boolean | number) {
    notifications.show({
      message,
      title,
      icon: <AiOutlineCheck />,
      color: "green",
      autoClose
    });
}

export function WarningNotification(message: string, title: string, autoClose: boolean | number) {
    notifications.show({
      message,
      title,
      icon: <AiOutlineWarning />,
      color: "orange",
      autoClose
    });
}
