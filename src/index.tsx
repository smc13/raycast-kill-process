import { ActionPanel, CopyToClipboardAction, ImageLike, List, showToast, ToastStyle, useNavigation } from "@raycast/api";
import psList from "ps-list";
import { useEffect, useState } from "react";

const DEFAULT_ICON = "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ExecutableBinaryIcon.icns";

export default function ProcessList() {
  const [state, setState] = useState<{ processes: Process[] }>({ processes: [] });
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetch() {
      const processes = await getProcesses();
      setState((oldState) => ({
        ...oldState,
        processes: processes,
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.processes.length === 0} searchBarPlaceholder="Filter articles by name...">
      {state.processes.map((process) => (
        <ProcessListItem key={process.id} process={process} pop={pop} />
      ))}
    </List>
  );
}

function ProcessListItem(props: { process: Process, pop: () => void }) {
  const {process, pop } = props;

  return (
    <List.Item
      id={process.id}
      key={process.id}
      title={process.name}
      subtitle={process.cmd}
      icon={process.icon}
      accessoryTitle={`CPU: ${process.cpu}, Memory: ${process.memory}`}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Kill Process" onAction={() => killProcess(process, pop)} />
          <CopyToClipboardAction title="Copy PID" content={process.id} />
        </ActionPanel>
      }
    />
  );
}

async function getProcesses() {
  try {
    const processes = await psList();

    return (await Promise.all(
      processes.map<Promise<Process>>(async (p) => {
        let icon: ImageLike = DEFAULT_ICON;
        try {
          const iconValue = (p.cmd ?? '').match(/.*?\.app\//)

          if (iconValue) {
            icon = { fileIcon: iconValue[0] }
          }
        } catch {}

        return {
          id: p.pid.toString(),
          name: p.name,
          icon: icon,
          cmd: p.cmd ?? "unknown",
          cpu: p.cpu,
          memory: p.memory,
        };
      }))
    ).sort((a, b) => ((a.cpu ?? 0) + (a.memory ?? 0)) > ((b.cpu ?? 0) + (b.memory ?? 0)) ? -1 : 1);
  } catch (e) {
    console.error(e);
    showToast(ToastStyle.Failure, "Failed to load processes");
    return Promise.resolve([]);
  }
}

function killProcess(p: Process, callback?: () => void) {
  process.kill(parseInt(p.id))
  showToast(ToastStyle.Success, "Process Killed", `Process [${p.name}] has been killed`)
  callback?.()
}

type Process = {
  id: string;
  name: string;
  icon: ImageLike;
  cmd: string;
  cpu?: number;
  memory?: number;
};
