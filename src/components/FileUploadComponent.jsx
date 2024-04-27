"use client";
import React, { useEffect, useState } from 'react';
import { Dropbox } from 'dropbox';
const ACCESS_TOKEN = process.env.NEXT_PUBLIC_ACCESS_TOKEN;
const FileUploadComponent = () => {
    const [file, setFile] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isProgress, setIsProgress] = useState(false);
    const [uploadedFileId, setUploadedFileId] = useState('');
    const [progress, setProgress] = useState(0);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
        if (file) {
            setIsActive(true);
            console.log(file);
        }
    };
    const dbx = new Dropbox({ accessToken: ACCESS_TOKEN });
    const setSessionIdCall = async () => {
        const sessionStart = await dbx.filesUploadSessionStart({
            close: false,
            contents: '',
        });
        setSessionId(sessionStart.result.session_id);
        console.log('setSessionIdCall', sessionId);
        return;
    }

    const handleUpload = async (e) => {
        setIsActive(false);
        e.preventDefault();
        if (!file) {
            console.log('no file selected');
            return;
        };
        sessionChunkUpload();
    };

    const sessionChunkUpload = async () => {
        setIsProgress(true);
        const CHUNK_SIZE = 5 * 1024 * 1024;
        const reader = new FileReader();

        const fileData = await new Promise((resolve, reject) => {
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.onerror = () => {
                reject(reader.error);
            };
            reader.readAsArrayBuffer(file);
        });

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
            const chunk = fileData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            await dbx.filesUploadSessionAppendV2({
                contents: chunk,
                close: i === totalChunks - 1,
                cursor: {
                    session_id: sessionId,
                    offset: i * CHUNK_SIZE,
                },
            });
            const chunkProgress = (chunk.byteLength / file.size) * 100;
            setProgress((prevProgress) => prevProgress + chunkProgress);
            console.log("progress # ", progress);
        }
        var uploadFinished = await dbx.filesUploadSessionFinish({
            cursor: {
                session_id: sessionId,
                offset: file.size,
            },
            contents: '',
            commit: {
                path: '/tests/' + file.name,
            }
        });

        setIsSuccess(true);

        reader.readAsArrayBuffer(file);

        if (!uploadFinished?.result?.id) {
            setIsError(true);
        } else {
            setUploadedFileId(uploadFinished?.result?.id);
        }
        setIsProgress(false);
    }

    useEffect(() => {
        setSessionIdCall();
        console.log("Progress updated:", progress);
    }, [progress]);
    return (
        <div className="container">
            <div className="row">
                <div className="col-12 py-2">
                    <div style={{ height: '10px' }}>
                        <div className={isProgress ? 'd-block' : 'd-none'}>
                            <div className="progress" role="progressbar" aria-label="Warning example" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
                                <div className="progress-bar text-bg-warning" style={{ width: `${progress}%` }}>{progress}%</div>
                            </div>
                        </div>
                    </div>
                    <div className='my-5'>
                        <form>
                            <input type="file" onChange={handleFileChange} className='form-control-file' />
                            <button onClick={handleUpload} className={`btn btn-primary ${isActive ? '' : 'disabled'}`} >Upload</button>
                        </form>
                    </div>
                    <div>
                        {isSuccess &&
                            <div className="alert alert-success" role="alert">
                                {file && `${file.name} uploaded: ${uploadedFileId}`}
                            </div>
                        }
                        {isError &&
                            <div className="alert alert-danger" role="alert">
                                Error occured!
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
export default FileUploadComponent;