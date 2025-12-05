import { ChangeEvent, ReactElement, createElement, useState, useRef, useCallback } from "react";
import { ActionValue, ListActionValue, ListValue } from "mendix";

export interface PhotoUploaderProps {
    entityList?: ListValue;
    onUploadAction?: ActionValue | ListActionValue;
    maxFiles: number;
    entityType?: string;
    uploadMode?: "file" | "camera" | "both";
    accept?: string;
    className?: string;
}

export function PhotoUploader({
    entityList,
    onUploadAction,
    maxFiles,
    entityType: configuredEntityType,
    uploadMode = "both",
    accept = "image/*",
    className = ""
}: PhotoUploaderProps): ReactElement {
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [entityGuids, setEntityGuids] = useState<string[]>([]); // 存储每个文件对应的实体 GUID
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // 获取实体类型的辅助函数
    const getEntityType = useCallback((): string | undefined => {
        // 优先使用用户配置的实体类型
        if (configuredEntityType) {
            return configuredEntityType;
        }

        if (!entityList) {
            return undefined;
        }

        // 尝试多种方式获取实体类型
        // 方式1: 从数据源内部属性获取
        if ((entityList as any).entityType) {
            return (entityList as any).entityType;
        }
        // 方式2: 从列表项中获取（如果有记录）
        if (entityList.items && entityList.items.length > 0) {
            return (entityList.items[0] as any).__entityType;
        }
        // 方式3: 尝试从数据源的内部结构获取
        if ((entityList as any)._entityType) {
            return (entityList as any)._entityType;
        }
        // 方式4: 尝试从数据源的 datasource 属性获取
        if ((entityList as any).datasource && (entityList as any).datasource.entityType) {
            return (entityList as any).datasource.entityType;
        }
        // 方式5: 尝试从数据源的 _dataSource 属性获取
        if ((entityList as any)._dataSource && (entityList as any)._dataSource.entityType) {
            return (entityList as any)._dataSource.entityType;
        }
        // 方式6: 尝试从数据源的 _entity 属性获取
        if ((entityList as any)._entity) {
            return (entityList as any)._entity;
        }
        // 方式7: 尝试从数据源的 _entityType 属性获取（不同命名）
        if ((entityList as any)._entityType) {
            return (entityList as any)._entityType;
        }

        return undefined;
    }, [configuredEntityType, entityList]);

    // 为文件创建实体的函数
    const createEntitiesForFiles = useCallback(
        async (files: File[]) => {
            if (files.length === 0 || !entityList) {
                return;
            }

            // 获取实体类型
            // 注意：entityList 数据源的实体类型必须继承自 System.FileDocument
            const entityType = getEntityType();
            if (!entityType) {
                console.error("无法获取实体类型", entityList);
                console.log("entityList 的所有属性:", Object.keys(entityList));
                console.log("entityList 的完整对象:", entityList);

                // 尝试更深入的调试信息
                if (entityList) {
                    console.log("尝试获取更多信息:");
                    console.log("- entityList.status:", entityList.status);
                    console.log("- entityList.items:", entityList.items);
                    console.log("- entityList 的所有键:", Object.keys(entityList));

                    // 尝试访问可能的内部属性
                    const listAny = entityList as any;
                    console.log("- listAny._entityType:", listAny._entityType);
                    console.log("- listAny.entityType:", listAny.entityType);
                    console.log("- listAny.datasource:", listAny.datasource);
                    if (listAny.datasource) {
                        console.log("- listAny.datasource.entityType:", listAny.datasource.entityType);
                        console.log("- listAny.datasource 的所有键:", Object.keys(listAny.datasource));
                    }
                }

                alert(
                    "无法获取实体类型。\n\n" +
                        "解决方案：\n" +
                        "1. 在属性面板中手动填写'实体类型'属性（例如：EntryImage）\n" +
                        "2. 或者在页面上创建一个数据源，选择继承自 System.FileDocument 的实体类型\n" +
                        "3. 确保数据源配置正确，即使列表为空也能获取实体类型\n\n" +
                        "注意：选择的实体类型必须继承自 System.FileDocument。"
                );
                return;
            }

            console.log("使用的实体类型:", entityType, "(必须继承自 System.FileDocument)");

            // 检查 mx.data 是否可用
            if (typeof (window as any).mx === "undefined" || !(window as any).mx.data) {
                console.error("无法访问 Mendix 数据 API");
                return;
            }

            setIsUploading(true);
            setUploadProgress(`正在创建 ${files.length} 个实体...`);

            const createdEntities: any[] = [];
            let successCount = 0;
            let errorCount = 0;

            // 为每个文件创建实体的函数
            const createEntityForFile = async (file: File, index: number): Promise<void> => {
                setUploadProgress(`正在处理 ${index + 1}/${files.length}: ${file.name}`);

                return new Promise<void>((resolve, reject) => {
                    (window as any).mx.data.create(
                        {
                            entity: entityType,
                            callback: async (obj: any) => {
                                try {
                                    // 先保存实体（FileDocument 实体需要先保存才能使用 saveDocument）
                                    // 注意：entityList 数据源的实体类型必须继承自 System.FileDocument
                                    (window as any).mx.data.commit({
                                        mxobj: obj,
                                        callback: () => {
                                            // 实体保存成功后，使用 mx.data.saveDocument 保存文件
                                            // entityList 数据源的实体类型继承自 System.FileDocument，使用 saveDocument API
                                            const entityGuid = obj.getGuid();
                                            (window as any).mx.data.saveDocument(
                                                entityGuid, // 实体的 GUID
                                                file.name, // 文件名
                                                {}, // 选项对象（元数据）
                                                file, // File 对象
                                                () => {
                                                    // 保存文件成功
                                                    createdEntities.push(obj);
                                                    successCount++;
                                                    // 保存实体 GUID，用于后续删除
                                                    setEntityGuids(prev => [...prev, entityGuid]);
                                                    resolve();
                                                },
                                                (error: any) => {
                                                    // 保存文件失败
                                                    console.error("保存文件到实体失败:", error);
                                                    errorCount++;
                                                    reject(error);
                                                }
                                            );
                                        },
                                        error: (error: any) => {
                                            console.error("保存实体失败:", error);
                                            errorCount++;
                                            reject(error);
                                        }
                                    });
                                } catch (error) {
                                    console.error("处理文件上传失败:", error);
                                    errorCount++;
                                    reject(error);
                                }
                            },
                            error: (error: any) => {
                                console.error("创建实体失败:", error);
                                errorCount++;
                                reject(error);
                            }
                        },
                        {
                            noReturn: false
                        }
                    );
                });
            };

            // 为每个文件创建实体
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    await createEntityForFile(file, i);
                } catch (error) {
                    console.error(`创建文件 ${file.name} 的实体失败:`, error);
                    errorCount++;
                }
            }

            // 刷新列表以显示新创建的实体
            if (entityList && entityList.reload) {
                entityList.reload();
            }

            setUploadProgress(`完成！成功创建 ${successCount} 个实体，失败: ${errorCount}`);
            setIsUploading(false);

            // 执行上传动作（如果配置了，用于额外的处理逻辑）
            // 注意：这里不执行，因为实体创建是在选择文件时完成的
            // 上传动作应该在 handleUpload 中执行

            // 清空进度提示
            setTimeout(() => {
                setUploadProgress("");
            }, 2000);
        },
        [entityList, getEntityType, onUploadAction]
    );

    // 处理文件选择
    const handleFileSelect = useCallback(
        (files: FileList | null) => {
            if (!files || files.length === 0) {
                return;
            }

            const currentFiles = selectedFiles;
            const remainingSlots = maxFiles - currentFiles.length;
            if (remainingSlots <= 0) {
                alert(`最多只能选择 ${maxFiles} 张照片`);
                return;
            }

            const filesToProcess = Array.from(files).slice(0, remainingSlots);
            const imageFiles: File[] = [];
            const previewPromises: Array<Promise<string>> = [];

            filesToProcess.forEach(file => {
                if (file.type.startsWith("image/")) {
                    imageFiles.push(file);
                    // 创建预览 URL
                    const previewPromise = new Promise<string>(resolve => {
                        const reader = new FileReader();
                        reader.onload = e => {
                            const result = e.target?.result as string;
                            resolve(result || "");
                        };
                        reader.onerror = () => resolve("");
                        reader.readAsDataURL(file);
                    });
                    previewPromises.push(previewPromise);
                }
            });

            // 等待所有预览加载完成
            Promise.all(previewPromises).then(async urls => {
                setSelectedFiles(prev => [...prev, ...imageFiles]);
                setPreviewUrls(prev => [...prev, ...urls.filter(url => url !== "")]);

                // 选择文件后立即创建实体记录
                if (imageFiles.length > 0 && entityList) {
                    await createEntitiesForFiles(imageFiles);
                }
            });
        },
        [maxFiles, selectedFiles, entityList, createEntitiesForFiles]
    );

    // 处理文件输入变化
    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            handleFileSelect(e.target.files);
            // 重置输入，允许选择相同文件
            if (e.target) {
                e.target.value = "";
            }
        },
        [handleFileSelect]
    );

    // 处理拍照
    const handleCameraClick = useCallback(() => {
        if (cameraInputRef.current) {
            cameraInputRef.current.click();
        }
    }, []);

    // 处理上传按钮点击
    const handleUploadClick = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    // 删除照片（同时删除数据库中的实体记录）
    const handleRemovePhoto = useCallback(
        async (index: number) => {
            console.log(`[删除] 开始删除索引 ${index} 的照片`);
            
            if (isUploading) {
                console.warn("[删除] 正在上传中，无法删除");
                alert("正在上传中，无法删除");
                return;
            }

            if (index < 0 || index >= selectedFiles.length) {
                console.error(`[删除] 索引超出范围: index=${index}, selectedFiles.length=${selectedFiles.length}`);
                alert(`删除失败：索引超出范围 (index=${index}, length=${selectedFiles.length})`);
                return;
            }

            console.log(`[删除] 开始删除索引 ${index} 的照片`);
            console.log(`[删除] entityGuids:`, entityGuids);
            console.log(`[删除] entityGuids[${index}]:`, entityGuids[index]);

            // 获取要删除的实体 GUID（在删除 UI 之前先保存）
            const entityGuid = entityGuids[index];

            // 检查 mx.data 是否可用
            if (typeof (window as any).mx === "undefined" || !(window as any).mx.data) {
                console.error("[删除] 无法访问 Mendix 数据 API");
                alert("无法访问 Mendix 数据 API，无法删除数据库记录");
                return;
            }

            // 尝试查找并删除实体
            let entityToDelete: any = null;
            let guidToDelete: string | null = null;

            // 方式1：如果有保存的 GUID，使用它
            if (entityGuid) {
                guidToDelete = entityGuid;
                console.log(`[删除] 使用保存的 GUID: ${guidToDelete}`);
            } else {
                // 方式2：尝试从 entityList 中查找
                console.log(`[删除] 没有保存的 GUID，尝试从 entityList 中查找`);
                if (entityList && entityList.items) {
                    console.log(`[删除] entityList.items.length: ${entityList.items.length}`);
                    if (entityList.items.length > index) {
                        const item = entityList.items[index];
                        try {
                            guidToDelete = (item as any).getGuid?.();
                            entityToDelete = item;
                            console.log(`[删除] 从 entityList 获取 GUID: ${guidToDelete}`);
                        } catch (error) {
                            console.error(`[删除] 获取 GUID 失败:`, error);
                        }
                    } else {
                        // 尝试通过遍历查找（可能顺序不一致）
                        console.log(`[删除] 索引超出范围，尝试遍历查找`);
                        for (let i = 0; i < entityList.items.length; i++) {
                            try {
                                const item = entityList.items[i];
                                const itemGuid = (item as any).getGuid?.();
                                console.log(`[删除] 检查 item[${i}], GUID: ${itemGuid}`);
                                // 这里可以根据文件名或其他属性匹配，暂时使用索引
                                if (i === index) {
                                    guidToDelete = itemGuid;
                                    entityToDelete = item;
                                    console.log(`[删除] 找到匹配的实体: ${guidToDelete}`);
                                    break;
                                }
                            } catch (error) {
                                console.error(`[删除] 检查 item[${i}] 时出错:`, error);
                            }
                        }
                    }
                }
            }

            // 执行删除操作
            if (guidToDelete) {
                console.log(`[删除] 准备删除实体，GUID: ${guidToDelete}`);
                console.log(`[删除] mx.data 对象:`, (window as any).mx?.data);
                console.log(`[删除] mx.data.remove 方法:`, typeof (window as any).mx?.data?.remove);
                console.log(`[删除] mx.data.delete 方法:`, typeof (window as any).mx?.data?.delete);
                
                try {
                    // 根据 Mendix API，应该使用 mx.data.remove
                    const mxData = (window as any).mx.data;
                    
                    if (mxData && typeof mxData.remove === "function") {
                        console.log(`[删除] 使用 mx.data.remove 删除实体`);
                        mxData.remove({
                            guid: guidToDelete,
                            callback: () => {
                                console.log(`[删除] ✅ 实体 ${guidToDelete} 已从数据库中删除`);
                                // 从 UI 中移除
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                                setEntityGuids(prev => prev.filter((_, i) => i !== index));
                                // 刷新列表
                                if (entityList && entityList.reload) {
                                    setTimeout(() => {
                                        entityList.reload();
                                    }, 100);
                                }
                            },
                            error: (error: any) => {
                                console.error(`[删除] ❌ 删除实体失败:`, error);
                                console.error(`[删除] 错误详情:`, {
                                    message: error?.message,
                                    stack: error?.stack,
                                    error,
                                    guid: guidToDelete
                                });
                                // 即使删除失败，也从 UI 中移除（避免 UI 不一致）
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                                setEntityGuids(prev => prev.filter((_, i) => i !== index));
                                alert(`删除数据库记录失败：${error?.message || "未知错误"}\n\n请查看浏览器控制台获取详细信息。`);
                            }
                        });
                    } else if (mxData && typeof mxData.delete === "function") {
                        console.log(`[删除] 使用 mx.data.delete 删除实体`);
                        mxData.delete({
                            guid: guidToDelete,
                            callback: () => {
                                console.log(`[删除] ✅ 实体 ${guidToDelete} 已从数据库中删除`);
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                                setEntityGuids(prev => prev.filter((_, i) => i !== index));
                                if (entityList && entityList.reload) {
                                    setTimeout(() => {
                                        entityList.reload();
                                    }, 100);
                                }
                            },
                            error: (error: any) => {
                                console.error(`[删除] ❌ 删除实体失败:`, error);
                                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                                setEntityGuids(prev => prev.filter((_, i) => i !== index));
                                alert(`删除数据库记录失败：${error?.message || "未知错误"}`);
                            }
                        });
                    } else if (entityToDelete) {
                        // 尝试使用实体对象的方法
                        console.log(`[删除] 尝试使用实体对象的方法`);
                        const entityObj = entityToDelete as any;
                        
                        // 尝试 remove 方法
                        if (typeof entityObj.remove === "function") {
                            entityObj.remove({
                                callback: () => {
                                    console.log(`[删除] ✅ 实体已删除`);
                                    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                                    setEntityGuids(prev => prev.filter((_, i) => i !== index));
                                    if (entityList && entityList.reload) {
                                        setTimeout(() => {
                                            entityList.reload();
                                        }, 100);
                                    }
                                },
                                error: (error: any) => {
                                    console.error(`[删除] ❌ 删除失败:`, error);
                                    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                                    setEntityGuids(prev => prev.filter((_, i) => i !== index));
                                    alert(`删除失败：${error?.message || "未知错误"}`);
                                }
                            });
                        } else {
                            console.error(`[删除] ❌ 无法找到删除方法`);
                            console.error(`[删除] mx.data 可用方法:`, Object.keys(mxData || {}));
                            console.error(`[删除] 实体对象可用方法:`, Object.keys(entityObj || {}));
                            // 仍然从 UI 中移除
                            setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                            setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                            setEntityGuids(prev => prev.filter((_, i) => i !== index));
                            alert("无法删除数据库记录：找不到删除方法。请查看浏览器控制台获取详细信息。");
                        }
                    } else {
                        console.error(`[删除] ❌ 无法找到删除方法，且没有实体对象`);
                        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                        setEntityGuids(prev => prev.filter((_, i) => i !== index));
                        alert("无法删除数据库记录：找不到删除方法。请查看浏览器控制台获取详细信息。");
                    }
                } catch (error) {
                    console.error(`[删除] ❌ 删除实体时发生异常:`, error);
                    console.error(`[删除] 异常详情:`, {
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined,
                        error
                    });
                    // 仍然从 UI 中移除
                    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                    setEntityGuids(prev => prev.filter((_, i) => i !== index));
                    alert(`删除时发生错误：${error instanceof Error ? error.message : "未知错误"}\n\n请查看浏览器控制台获取详细信息。`);
                }
            } else {
                console.warn(`[删除] ⚠️ 无法找到要删除的实体 GUID`);
                console.warn(`[删除] entityGuids:`, entityGuids);
                console.warn(`[删除] entityList.items:`, entityList?.items);
                // 仍然从 UI 中移除（可能是还未创建的实体）
                setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                setEntityGuids(prev => prev.filter((_, i) => i !== index));
                console.log(`[删除] 已从 UI 中移除，但未删除数据库记录（可能实体还未创建）`);
            }
        },
        [entityGuids, entityList, isUploading]
    );

    // 上传文件到 Mendix - 执行上传动作（如果配置了）
    // 确保 entityList 包含所有新创建的实体，并以列表形式传递给微流
    const handleUpload = useCallback(async () => {
        if (selectedFiles.length === 0) {
            return;
        }

        if (!entityList) {
            alert("请配置实体列表");
            return;
        }

        // 执行上传动作（如果配置了）
        if (onUploadAction) {
            setIsUploading(true);
            setUploadProgress("正在刷新实体列表...");

            try {
                // 先刷新 entityList，确保获取到最新创建的所有实体
                // 使用重试机制，确保列表已经更新
                let retryCount = 0;
                const maxRetries = 5;
                let hasRefreshed = false;

                while (retryCount < maxRetries && !hasRefreshed) {
                    if (entityList && entityList.reload) {
                        entityList.reload();
                        // 等待列表刷新（每次等待时间递增）
                        const waitTime = 500 + retryCount * 300; // 500ms, 800ms, 1100ms, 1400ms, 1700ms
                        await new Promise(resolve => setTimeout(resolve, waitTime));

                        // 检查列表是否已更新（如果列表中有项，认为已刷新）
                        if (entityList.items && entityList.items.length > 0) {
                            hasRefreshed = true;
                            console.log(`实体列表已刷新，包含 ${entityList.items.length} 个实体`);
                        } else {
                            retryCount++;
                            console.log(`等待实体列表刷新 (尝试 ${retryCount}/${maxRetries})...`);
                        }
                    } else {
                        break;
                    }
                }

                setUploadProgress("正在执行上传动作...");

                // 检查是否是 ListActionValue（当 action 链接到 datasource 时）
                if (typeof (onUploadAction as any).get === "function") {
                    // ListActionValue: 当 action 链接到 datasource 时
                    // Mendix 平台会自动将整个 entityList 作为数据源传递给微流
                    // 微流可以通过数据源访问完整的实体列表（ListValue 类型）
                    console.log(`准备执行微流，entityList 包含 ${entityList.items?.length || 0} 个实体`);

                    // 如果有 items，使用第一个 item 来获取动作（这是 Mendix 的标准方式）
                    // 注意：虽然使用第一个 item 获取动作，但微流会接收到整个 entityList 作为数据源
                    if (entityList.items && entityList.items.length > 0) {
                        const firstItem = entityList.items[0];
                        const itemAction = (onUploadAction as any).get(firstItem);
                        if (itemAction && itemAction.canExecute && !itemAction.isExecuting) {
                            console.log("执行微流，微流将接收到完整的 entityList 作为数据源");
                            await itemAction.execute();
                            console.log("微流执行完成");
                        } else {
                            console.warn("微流无法执行:", {
                                hasItemAction: !!itemAction,
                                canExecute: itemAction?.canExecute,
                                isExecuting: itemAction?.isExecuting
                            });
                            alert("上传动作无法执行");
                        }
                    } else {
                        console.warn("实体列表为空，无法执行 ListActionValue");
                        alert("实体列表为空，请确保已成功创建实体");
                    }
                } else {
                    // ActionValue: 正常执行
                    const actionValue = onUploadAction as ActionValue;
                    if (actionValue.canExecute && !actionValue.isExecuting) {
                        console.log("执行 ActionValue");
                        await actionValue.execute();
                        console.log("ActionValue 执行完成");
                    } else {
                        console.warn("ActionValue 无法执行:", {
                            canExecute: actionValue.canExecute,
                            isExecuting: actionValue.isExecuting
                        });
                        alert("上传动作无法执行");
                    }
                }

                setUploadProgress("上传动作执行完成");

                // 再次刷新列表以确保显示最新状态
                if (entityList && entityList.reload) {
                    entityList.reload();
                }
            } catch (error) {
                console.error("执行上传动作失败:", error);
                alert(`上传动作执行失败：${error instanceof Error ? error.message : "未知错误"}`);
            } finally {
                setIsUploading(false);
                setTimeout(() => {
                    setUploadProgress("");
                }, 2000);
            }
        } else {
            // 如果没有配置上传动作，提示用户实体已创建
            alert(`已为 ${selectedFiles.length} 张图片创建了实体记录`);
        }
    }, [selectedFiles, onUploadAction, entityList]);

    return (
        <div className={`photo-uploader-container ${className}`}>
            <div className="photo-uploader-controls">
                {(uploadMode === "file" || uploadMode === "both") && (
                    <button
                        type="button"
                        className="photo-uploader-btn photo-uploader-btn-upload"
                        onClick={handleUploadClick}
                        disabled={selectedFiles.length >= maxFiles || isUploading}
                    >
                        <span className="photo-uploader-icon">📁</span>
                        选择照片
                    </button>
                )}
                {(uploadMode === "camera" || uploadMode === "both") && (
                    <button
                        type="button"
                        className="photo-uploader-btn photo-uploader-btn-camera"
                        onClick={handleCameraClick}
                        disabled={selectedFiles.length >= maxFiles || isUploading}
                    >
                        <span className="photo-uploader-icon">📷</span>
                        拍照
                    </button>
                )}
                {selectedFiles.length > 0 && (
                    <button
                        type="button"
                        className="photo-uploader-btn photo-uploader-btn-submit"
                        onClick={handleUpload}
                        disabled={isUploading || !entityList}
                    >
                        {isUploading ? "上传中..." : `上传 (${selectedFiles.length})`}
                    </button>
                )}
            </div>

            {/* 上传进度提示 */}
            {isUploading && uploadProgress && <div className="photo-uploader-progress">{uploadProgress}</div>}

            {/* 隐藏的文件输入 */}
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple
                style={{ display: "none" }}
                onChange={handleInputChange}
            />

            {/* 隐藏的相机输入 */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handleInputChange}
            />

            {/* 照片预览网格 */}
            {previewUrls.length > 0 && (
                <div className="photo-uploader-preview-grid">
                    {previewUrls.map((url, index) => {
                        // 创建一个稳定的删除处理函数
                        const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // 直接调用删除函数
                            if (typeof handleRemovePhoto === 'function') {
                                const result = handleRemovePhoto(index);
                                if (result instanceof Promise) {
                                    result.catch((error) => {
                                        console.error(`[删除] 删除操作失败:`, error);
                                        alert(`删除操作失败：${error instanceof Error ? error.message : String(error)}`);
                                    });
                                }
                            } else {
                                console.error(`[删除] handleRemovePhoto 不是函数！`);
                                alert(`错误：删除功能不可用`);
                            }
                        };
                        
                        return (
                            <div 
                                key={index} 
                                className="photo-uploader-preview-item"
                                onClick={() => {
                                    console.log(`[预览项] 预览项被点击，索引: ${index}`);
                                }}
                            >
                                <img 
                                    src={url} 
                                    alt={`预览 ${index + 1}`}
                                    onClick={() => {
                                        console.log(`[图片] 图片被点击，索引: ${index}`);
                                    }}
                                    style={{ pointerEvents: 'none' }}
                                />
                                <button
                                    type="button"
                                    className="photo-uploader-remove-btn"
                                    onClick={handleDelete}
                                    aria-label="删除照片"
                                    disabled={isUploading}
                                    style={{ 
                                        cursor: isUploading ? 'not-allowed' : 'pointer',
                                        zIndex: 9999,
                                        position: 'absolute',
                                        pointerEvents: isUploading ? 'none' : 'auto',
                                        backgroundColor: 'rgba(220, 53, 69, 0.9)',
                                        top: '8px',
                                        right: '8px',
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        color: 'white',
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 文件数量提示 */}
            {selectedFiles.length > 0 && (
                <div className="photo-uploader-info">
                    已选择 {selectedFiles.length} / {maxFiles} 张照片
                    {!entityList && <span style={{ color: "#dc3545", marginLeft: "8px" }}>（请配置实体列表）</span>}
                    {!onUploadAction && <span style={{ color: "#ffc107", marginLeft: "8px" }}>（请配置上传动作）</span>}
                    {entityList && (
                        <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                            提示：在微流中通过数据源访问 entityList，获取图片列表并处理关联关系。
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
