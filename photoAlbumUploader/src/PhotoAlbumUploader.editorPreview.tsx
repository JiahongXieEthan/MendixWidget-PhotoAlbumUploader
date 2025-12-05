import { ReactElement, createElement } from "react";
import { PhotoUploader } from "./components/PhotoUploader";
import { PhotoAlbumUploaderPreviewProps } from "../typings/PhotoAlbumUploaderProps";

export function preview({ class: className, styleObject, maxFiles, uploadMode }: PhotoAlbumUploaderPreviewProps): ReactElement {
    return (
        <div className={className} style={styleObject}>
            <PhotoUploader 
                maxFiles={maxFiles ?? 10} 
                uploadMode={uploadMode ?? "both"}
                className="" 
            />
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/PhotoAlbumUploader.css");
}
