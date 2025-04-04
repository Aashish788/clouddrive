import { FileActionModal } from "./file-action-modal";
import { GroupManagementModal } from "./group-management-modal";
import { FileUploadModal } from "./file-upload-modal";
import { FileShareModal } from "./file-share-modal";

export default function ModalContainer() {
  return (
    <>
      <FileActionModal />
      <GroupManagementModal />
      <FileUploadModal />
      <FileShareModal />
    </>
  );
}
