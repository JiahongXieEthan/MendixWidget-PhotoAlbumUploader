import { ReactElement, createElement } from "react";
import { PhotoUploader } from "./components/PhotoUploader";

import { PhotoAlbumUploaderContainerProps } from "../typings/PhotoAlbumUploaderProps";

import "./ui/PhotoAlbumUploader.css";

export function PhotoAlbumUploader({
    entityList,
    onUploadAction,
    maxFiles,
    entityType,
    uploadMode = "both",
    class: className,
    style
}: PhotoAlbumUploaderContainerProps): ReactElement {
    return (
        <div className={className} style={style}>
            <PhotoUploader
                entityList={entityList}
                onUploadAction={onUploadAction}
                maxFiles={maxFiles}
                entityType={entityType}
                uploadMode={uploadMode}
                className=""
            />
        </div>
    );
}
