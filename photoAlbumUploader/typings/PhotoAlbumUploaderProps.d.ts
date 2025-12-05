/**
 * This file was generated from PhotoAlbumUploader.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { ListValue, ListActionValue } from "mendix";

export type UploadModeEnum = "file" | "camera" | "both";

export interface PhotoAlbumUploaderContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    entityList: ListValue;
    onUploadAction?: ListActionValue;
    maxFiles: number;
    entityType: string;
    uploadMode: UploadModeEnum;
}

export interface PhotoAlbumUploaderPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode?: "design" | "xray" | "structure";
    entityList: {} | { caption: string } | { type: string } | null;
    onUploadAction: {} | null;
    maxFiles: number | null;
    entityType: string;
    uploadMode: UploadModeEnum;
}
