
            var recordingPlayer = document.querySelector('#recording-player');
            var recordingMedia = document.querySelector('.recording-media');
            var mediaContainerFormat = document.querySelector('.media-container-format');
            var mimeType = 'video/webm';
            var fileExtension = 'webm';
            var type = 'video';
            var recorderType;
            var defaultWidth;
            var defaultHeight;
            

            var btnStartRecording = document.querySelector('#btn-start-recording');

            window.onbeforeunload = function() {
                btnStartRecording.disabled = false;
                recordingMedia.disabled = false;
                mediaContainerFormat.disabled = false;
            };

            btnStartRecording.onclick = function(event) {
                var button = btnStartRecording;

                if(button.innerHTML === 'Stop Recording') {
                    btnPauseRecording.style.display = 'none';
                    button.disabled = true;
                    button.disableStateWaiting = true;
                    setTimeout(function() {
                        button.disabled = false;
                        button.disableStateWaiting = false;
                    }, 2000);

                    button.innerHTML = 'Star Recording';

                    function stopStream() {
                        if(button.stream && button.stream.stop) {
                            button.stream.stop();
                            button.stream = null;
                        }

                        if(button.stream instanceof Array) {
                            button.stream.forEach(function(stream) {
                                stream.stop();
                            });
                            button.stream = null;
                        }

                        videoBitsPerSecond = null;
                    }

                    if(button.recordRTC) {
                        if(button.recordRTC.length) {
                            button.recordRTC[0].stopRecording(function(url) {
                                if(!button.recordRTC[1]) {
                                    button.recordingEndedCallback(url);
                                    stopStream();

                                    saveToDiskOrOpenNewTab(button.recordRTC[0]);
                                    return;
                                }

                                button.recordRTC[1].stopRecording(function(url) {
                                    button.recordingEndedCallback(url);
                                    stopStream();
                                });
                            });
                        }
                        else {
                            button.recordRTC.stopRecording(function(url) {
                                button.recordingEndedCallback(url);
                                stopStream();

                                saveToDiskOrOpenNewTab(button.recordRTC);
                            });
                        }
                    }

                    return;
                }

                if(!event) return;

                button.disabled = true;

                var commonConfig = {
                    onMediaCaptured: function(stream) {
                        button.stream = stream;
                        if(button.mediaCapturedCallback) {
                            button.mediaCapturedCallback();
                        }

                        button.innerHTML = 'Stop Recording';
                        button.disabled = false;
                    },
                    onMediaStopped: function() {
                        button.innerHTML = 'Start Recording';

                        if(!button.disableStateWaiting) {
                            button.disabled = false;
                        }
                    },
                    onMediaCapturingFailed: function(error) {
                        if(error.name === 'PermissionDeniedError' && !!navigator.mozGetUserMedia) {
                            InstallTrigger.install({
                                'Foo': {
                                    // URL: 'https://addons.mozilla.org/en-US/firefox/addon/enable-screen-capturing/',
                                    URL: 'https://addons.cdn.mozilla.net/user-media/addons/655146/enable_screen_capturing_in_firefox-1.1.001-fx.xpi?filehash=sha256%3Acb13851aaca148fcbd6672fc2dddfb9653c52a529588fb27ad018e834fbb3099',
                                    toString: function() {
                                        return this.URL;
                                    }
                                }
                            });
                        }

                        commonConfig.onMediaStopped();
                    }
                };

                if(mediaContainerFormat.value === 'h264') {
                    mimeType = 'video/webm\;codecs=h264';
                    fileExtension = 'mp4';

                    if(typeof MediaRecorder.isTypeSupported === 'function') {
                        if(MediaRecorder.isTypeSupported('video/mpeg')) {
                            mimeType = 'video/mpeg';
                        }
                        else {
                            mimeType = 'video/webm\;codecs=h264';
                        }
                    }
                }

                if(mediaContainerFormat.value === 'vp8') {
                    mimeType = 'video/webm\;codecs=vp8';
                    fileExtension = 'webm';
                    recorderType = null;
                    type = 'video';
                }

                if(mediaContainerFormat.value === 'vp9') {
                    mimeType = 'video/webm\;codecs=vp9';
                    fileExtension = 'webm';
                    recorderType = null;
                    type = 'video';
                }

                if(mediaContainerFormat.value === 'pcm') {
                    mimeType = 'audio/wav';
                    fileExtension = 'wav';
                    recorderType = StereoAudioRecorder;
                    type = 'audio';
                }

                if(mediaContainerFormat.value === 'opus') {
                    mimeType = 'audio/webm';
                    fileExtension = 'webm'; // ogg or webm?
                    recorderType = null;
                    type = 'audio';
                }

                if(mediaContainerFormat.value === 'whammy') {
                    mimeType = 'video/webm';
                    fileExtension = 'webm';
                    recorderType = WhammyRecorder;
                    type = 'video';
                }

                if(mediaContainerFormat.value === 'gif') {
                    mimeType = 'image/gif';
                    fileExtension = 'gif';
                    recorderType = GifRecorder;
                    type = 'gif';
                }

                if(recordingMedia.value === 'record-audio') {
                    captureAudio(commonConfig);

                    button.mediaCapturedCallback = function() {
                        var options = {
                            type: type,
                            mimeType: mimeType,
                            leftChannel: params.leftChannel || false,
                            disableLogs: params.disableLogs || false
                        };

                        if(params.sampleRate) {
                            options.sampleRate = parseInt(params.sampleRate);
                        }

                        if(params.bufferSize) {
                            options.bufferSize = parseInt(params.bufferSize);
                        }

                        if(recorderType) {
                            options.recorderType = recorderType;
                        }

                        if(videoBitsPerSecond) {
                            options.videoBitsPerSecond = videoBitsPerSecond;
                        }

                        if(webrtcDetectedBrowser === 'edge') {
                            options.numberOfAudioChannels = 1;
                        }

                        button.recordRTC = RecordRTC(button.stream, options);

                        button.recordingEndedCallback = function(url) {
                            setVideoURL(url);
                        };

                        button.recordRTC.startRecording();
                        btnPauseRecording.style.display = '';
                    };
                }

                if(recordingMedia.value === 'record-audio-plus-video') {
                    captureAudioPlusVideo(commonConfig);

                    button.mediaCapturedCallback = function() {
                        if(typeof MediaRecorder === 'undefined') { // opera or chrome etc.
                            button.recordRTC = [];

                            if(!params.bufferSize) {
                                // it fixes audio issues whilst recording 720p
                                params.bufferSize = 16384;
                            }

                            var options = {
                                type: 'audio', // hard-code to set "audio"
                                leftChannel: params.leftChannel || false,
                                disableLogs: params.disableLogs || false,
                                video: recordingPlayer
                            };

                            if(params.sampleRate) {
                                options.sampleRate = parseInt(params.sampleRate);
                            }

                            if(params.bufferSize) {
                                options.bufferSize = parseInt(params.bufferSize);
                            }

                            if(params.frameInterval) {
                                options.frameInterval = parseInt(params.frameInterval);
                            }

                            if(recorderType) {
                                options.recorderType = recorderType;
                            }

                            if(videoBitsPerSecond) {
                                options.videoBitsPerSecond = videoBitsPerSecond;
                            }

                            if(chkMultiStreamRecorder.checked === true) {
                                options.previewStream = function(previewStream) {
                                    setVideoURL(previewStream, true);
                                };
                            }

                            var audioRecorder = RecordRTC(button.stream, options);

                            options.type = type;
                            var videoRecorder = RecordRTC(button.stream, options);

                            // to sync audio/video playbacks in browser!
                            videoRecorder.initRecorder(function() {
                                audioRecorder.initRecorder(function() {
                                    audioRecorder.startRecording();
                                    videoRecorder.startRecording();
                                    btnPauseRecording.style.display = '';
                                });
                            });

                            button.recordRTC.push(audioRecorder, videoRecorder);

                            button.recordingEndedCallback = function() {
                                var audio = new Audio();
                                audio.src = audioRecorder.toURL();
                                audio.controls = true;
                                audio.autoplay = true;

                                recordingPlayer.parentNode.appendChild(document.createElement('hr'));
                                recordingPlayer.parentNode.appendChild(audio);

                                if(audio.paused) audio.play();
                            };
                            return;
                        }

                        var options = {
                            type: type,
                            mimeType: mimeType,
                            disableLogs: params.disableLogs || false,
                            getNativeBlob: false, // enable it for longer recordings
                            video: recordingPlayer
                        };

                        if(recorderType) {
                            options.recorderType = recorderType;

                            if(recorderType == WhammyRecorder || recorderType == GifRecorder) {
                                options.canvas = options.video = {
                                    width: defaultWidth || 320,
                                    height: defaultHeight || 240
                                };
                            }
                        }

                        if(videoBitsPerSecond) {
                            options.videoBitsPerSecond = videoBitsPerSecond;
                        }

                        if(chkMultiStreamRecorder.checked === true) {
                            options.previewStream = function(previewStream) {
                                setVideoURL(previewStream, true);
                            };

                            var width = 320;
                            var height = 240;

                            var select = document.querySelector('.media-resolutions');
                            var value = select.value;

                            if(value != 'default') {
                                value = value.split('x');

                                if(value.length == 2) {
                                    width = parseInt(value[0]);
                                    height = parseInt(value[1]);
                                }
                            }

                            options.video = {
                                width: width,
                                height: height
                            };
                        }

                        button.recordRTC = RecordRTC(button.stream, options);

                        button.recordingEndedCallback = function(url) {
                            setVideoURL(url);
                        };

                        button.recordRTC.startRecording();
                        btnPauseRecording.style.display = '';
                    };
                }

                if(recordingMedia.value === 'record-screen') {
                    captureScreen(commonConfig);

                    button.mediaCapturedCallback = function() {
                        var options = {
                            type: type,
                            mimeType: mimeType,
                            disableLogs: params.disableLogs || false,
                            getNativeBlob: false, // enable it for longer recordings
                            video: recordingPlayer
                        };

                        if(recorderType) {
                            options.recorderType = recorderType;

                            if(recorderType == WhammyRecorder || recorderType == GifRecorder) {
                                options.canvas = options.video = {
                                    width: defaultWidth || 320,
                                    height: defaultHeight || 240
                                };
                            }
                        }

                        if(videoBitsPerSecond) {
                            options.videoBitsPerSecond = videoBitsPerSecond;
                        }

                        button.recordRTC = RecordRTC(button.stream, options);

                        button.recordingEndedCallback = function(url) {
                            setVideoURL(url);
                        };

                        button.recordRTC.startRecording();
                        btnPauseRecording.style.display = '';
                    };
                }

                // note: audio+tab is supported in Chrome 50+
                // todo: add audio+tab recording
                if(recordingMedia.value === 'record-audio-plus-screen') {
                    captureAudioPlusScreen(commonConfig);

                    button.mediaCapturedCallback = function() {
                        var options = {
                            type: type,
                            mimeType: mimeType,
                            disableLogs: params.disableLogs || false,
                            getNativeBlob: false, // enable it for longer recordings
                            video: recordingPlayer
                        };

                        if(recorderType) {
                            options.recorderType = recorderType;

                            if(recorderType == WhammyRecorder || recorderType == GifRecorder) {
                                options.canvas = options.video = {
                                    width: defaultWidth || 320,
                                    height: defaultHeight || 240
                                };
                            }
                        }

                        if(videoBitsPerSecond) {
                            options.videoBitsPerSecond = videoBitsPerSecond;
                        }

                        button.recordRTC = RecordRTC(button.stream, options);

                        button.recordingEndedCallback = function(url) {
                            setVideoURL(url);
                        };

                        button.recordRTC.startRecording();
                        btnPauseRecording.style.display = '';
                    };
                }
            };

            function captureVideo(config) {
                captureUserMedia({video: true}, function(videoStream) {
                    config.onMediaCaptured(videoStream);

                    addStreamStopListener(videoStream, function() {
                        config.onMediaStopped();
                    });
                }, function(error) {
                    config.onMediaCapturingFailed(error);
                });
            }

            function captureAudio(config) {
                captureUserMedia({audio: true}, function(audioStream) {
                    config.onMediaCaptured(audioStream);

                    addStreamStopListener(audioStream, function() {
                        config.onMediaStopped();
                    });
                }, function(error) {
                    config.onMediaCapturingFailed(error);
                });
            }

            function captureAudioPlusVideo(config) {
                captureUserMedia({video: true, audio: true}, function(audioVideoStream) {
                    config.onMediaCaptured(audioVideoStream);

                    if(audioVideoStream instanceof Array) {
                        audioVideoStream.forEach(function(stream) {
                            addStreamStopListener(stream, function() {
                                config.onMediaStopped();
                            });
                        });
                        return;
                    }

                    addStreamStopListener(audioVideoStream, function() {
                        config.onMediaStopped();
                    });
                }, function(error) {
                    config.onMediaCapturingFailed(error);
                });
            }

            function captureScreen(config) {
                window.getScreenId = function(chromeMediaSource, chromeMediaSourceId) {
                    var screenConstraints = {
                        audio: false,
                        video: {
                            mandatory: {
                                chromeMediaSourceId: chromeMediaSourceId,
                                chromeMediaSource: chromeMediaSource
                            }
                        }
                    };

                    if(webrtcDetectedBrowser == 'firefox') {
                        screenConstraints = {
                            video: {
                                mediaSource: 'window'
                            }
                        }
                    }

                    captureUserMedia(screenConstraints, function(screenStream) {
                        config.onMediaCaptured(screenStream);

                        addStreamStopListener(screenStream, function() {
                            // config.onMediaStopped();

                            btnStartRecording.onclick();
                        });
                    }, function(error) {
                        config.onMediaCapturingFailed(error);
                    });
                };

                if(webrtcDetectedBrowser == 'firefox') {
                    window.getScreenId();
                }

                window.postMessage('get-sourceId', '*');
            }

            function captureAudioPlusScreen(config) {
                window.getScreenId = function(chromeMediaSource, chromeMediaSourceId) {
                    var screenConstraints = {
                        audio: false,
                        video: {
                            mandatory: {
                                chromeMediaSourceId: chromeMediaSourceId,
                                chromeMediaSource: chromeMediaSource
                            }
                        }
                    };

                    if(webrtcDetectedBrowser == 'firefox') {
                        screenConstraints = {
                            video: {
                                mediaSource: 'window',
                            },
                            audio: true
                        }
                    }

                    captureUserMedia(screenConstraints, function(screenStream) {
                        if(webrtcDetectedBrowser == 'firefox') {
                            config.onMediaCaptured(screenStream);

                            addStreamStopListener(screenStream, function() {
                                config.onMediaStopped();
                            });
                            return;
                        }

                        captureUserMedia({audio: true}, function(audioStream) {
                            // merge audio tracks into the screen
                            screenStream.addTrack(audioStream.getAudioTracks()[0]);

                            config.onMediaCaptured(screenStream);

                            addStreamStopListener(screenStream, function() {
                                config.onMediaStopped();
                            });
                        }, function(error) {
                            config.onMediaCapturingFailed(error);
                        });
                    }, function(error) {
                        config.onMediaCapturingFailed(error);
                    });
                };

                if(webrtcDetectedBrowser == 'firefox') {
                    window.getScreenId();
                }

                window.postMessage('get-sourceId', '*');
            }

            var videoBitsPerSecond;

            function setVideoBitrates() {
                var select = document.querySelector('.media-bitrates');
                var value = select.value;

                if(value == 'default') {
                    videoBitsPerSecond = null;
                    return;
                }

                videoBitsPerSecond = parseInt(value);
            }

            function getFrameRates(mediaConstraints) {
                if(!mediaConstraints.video) {
                    return mediaConstraints;
                }

                var select = document.querySelector('.media-framerates');
                var value = select.value;

                if(value == 'default') {
                    return mediaConstraints;
                }

                value = parseInt(value);

                if(webrtcDetectedBrowser == 'firefox') {
                    mediaConstraints.video.frameRate = value;
                    return mediaConstraints;
                }

                if(!mediaConstraints.video.mandatory) {
                    mediaConstraints.video.mandatory = {};
                    mediaConstraints.video.optional = [];
                }

                var isScreen = recordingMedia.value.toString().toLowerCase().indexOf('screen') != -1;
                if(isScreen) {
                    mediaConstraints.video.mandatory.maxFrameRate = value;
                }
                else {
                    mediaConstraints.video.mandatory.minFrameRate = value;
                }

                return mediaConstraints;
            }

            function setGetFromLocalStorage(selectors) {
                selectors.forEach(function(selector) {
                    var storageItem = selector.replace(/\.|#/g, '');
                    if(localStorage.getItem(storageItem)) {
                        document.querySelector(selector).value = localStorage.getItem(storageItem);
                    }

                    addEventListenerToUploadLocalStorageItem(selector, ['change', 'blur'], function() {
                        localStorage.setItem(storageItem, document.querySelector(selector).value);
                    });
                });
            }

            function addEventListenerToUploadLocalStorageItem(selector, arr, callback) {
                arr.forEach(function(event) {
                    document.querySelector(selector).addEventListener(event, callback, false);
                });
            }

            setGetFromLocalStorage(['.media-resolutions', '.media-framerates', '.media-bitrates', '.recording-media', '.media-container-format']);

            function getVideoResolutions(mediaConstraints) {
                if(!mediaConstraints.video) {
                    return mediaConstraints;
                }

                var select = document.querySelector('.media-resolutions');
                var value = select.value;

                if(value == 'default') {
                    return mediaConstraints;
                }

                value = value.split('x');

                if(value.length != 2) {
                    return mediaConstraints;
                }

                defaultWidth = parseInt(value[0]);
                defaultHeight = parseInt(value[1]);

                if(webrtcDetectedBrowser == 'firefox') {
                    mediaConstraints.video.width = defaultWidth;
                    mediaConstraints.video.height = defaultHeight;
                    return mediaConstraints;
                }

                if(!mediaConstraints.video.mandatory) {
                    mediaConstraints.video.mandatory = {};
                    mediaConstraints.video.optional = [];
                }

                var isScreen = recordingMedia.value.toString().toLowerCase().indexOf('screen') != -1;

                if(isScreen) {
                    mediaConstraints.video.mandatory.maxWidth = defaultWidth;
                    mediaConstraints.video.mandatory.maxHeight = defaultHeight;
                }
                else {
                    mediaConstraints.video.mandatory.minWidth = defaultWidth;
                    mediaConstraints.video.mandatory.minHeight = defaultHeight;
                }

                return mediaConstraints;
            }

            function captureUserMedia(mediaConstraints, successCallback, errorCallback) {
                if(mediaConstraints.video == true) {
                    mediaConstraints.video = {};
                }

                setVideoBitrates();

                mediaConstraints = getVideoResolutions(mediaConstraints);
                mediaConstraints = getFrameRates(mediaConstraints);

                var isBlackBerry = !!(/BB10|BlackBerry/i.test(navigator.userAgent || ''));
                if(isBlackBerry && !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)) {
                    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                    navigator.getUserMedia(mediaConstraints, successCallback, errorCallback);
                    return;
                }

                if(chkMultiStreamRecorder.checked === true) {
                    captureAllCameras(successCallback, errorCallback);
                    return;
                }

                navigator.mediaDevices.getUserMedia(mediaConstraints).then(function(stream) {
                    successCallback(stream);

                    setVideoURL(stream, true);
                }).catch(function(error) {
                    if(error && error.name === 'ConstraintNotSatisfiedError') {
                        alert('Your camera or browser does NOT supports selected resolutions or frame-rates. \n\nPlease select "default" resolutions.');
                    }

                    errorCallback(error);
                });
            }

            function setMediaContainerFormat(arrayOfOptionsSupported) {
                var options = Array.prototype.slice.call(
                    mediaContainerFormat.querySelectorAll('option')
                );

                var localStorageItem;
                if(localStorage.getItem('media-container-format')) {
                    localStorageItem = localStorage.getItem('media-container-format');
                }

                var selectedItem;
                options.forEach(function(option) {
                    option.disabled = true;

                    if(arrayOfOptionsSupported.indexOf(option.value) !== -1) {
                        option.disabled = false;

                        if(localStorageItem && arrayOfOptionsSupported.indexOf(localStorageItem) != -1) {
                            if(option.value != localStorageItem) return;
                            option.selected = true;
                            selectedItem = option;
                            return;
                        }

                        if(!selectedItem) {
                            option.selected = true;
                            selectedItem = option;
                        }
                    }
                });
            }

            recordingMedia.onchange = function() {
                var options = [];
                if(recordingMedia.value === 'record-audio') {
                    setMediaContainerFormat(['opus', 'pcm']);
                    return;
                }
                setMediaContainerFormat(['vp8', 'vp9', 'h264', 'gif', 'whammy']);
            };
            recordingMedia.onchange();

            if(webrtcDetectedBrowser === 'edge') {
                // webp isn't supported in Microsoft Edge
                // neither MediaRecorder API
                // so lets disable both video/screen recording options

                console.warn('Neither MediaRecorder API nor webp is supported in Microsoft Edge. You cam merely record audio.');

                recordingMedia.innerHTML = '<option value="record-audio">Audio</option>';
                setMediaContainerFormat(['pcm']);
            }

            function saveToDiskOrOpenNewTab(recordRTC) {
                var fileName = 'RecordRTC-' + (new Date).toISOString().replace(/:|\./g, '-') + '.' + fileExtension;

                document.querySelector('#save-to-disk').parentNode.style.display = 'block';
                document.querySelector('#save-to-disk').onclick = function() {
                    if(!recordRTC) return alert('No recording found.');

                    var file = new File([recordRTC.getBlob()], fileName, {
                        type: mimeType
                    });

                    invokeSaveAsDialog(file, file.name);
                };

                document.querySelector('#open-new-tab').onclick = function() {
                    if(!recordRTC) return alert('No recording found.');

                    var file = new File([recordRTC.getBlob()], fileName, {
                        type: mimeType
                    });

                    window.open(URL.createObjectURL(file));
                };

                // upload to PHP server
                document.querySelector('#upload-to-php').disabled = false;
                document.querySelector('#upload-to-php').onclick = function() {
                    if(!recordRTC) return alert('No recording found.');
                    this.disabled = true;

                    var button = this;
                    uploadToPHPServer(fileName, recordRTC, function(progress, fileURL) {
                        if(progress === 'ended') {
                            button.disabled = false;
                            button.innerHTML = 'Click to download from server';
                            button.onclick = function() {
                                SaveFileURLToDisk(fileURL, fileName);
                            };

                            setVideoURL(fileURL);
                            return;
                        }
                        button.innerHTML = progress;
                    });
                };

                // upload to YouTube!
                document.querySelector('#upload-to-youtube').disabled = false;
                document.querySelector('#upload-to-youtube').onclick = function() {
                    if(!recordRTC) return alert('No recording found.');
                    this.disabled = true;

                    var button = this;
                    uploadToYouTube(fileName, recordRTC, function(percentageComplete, fileURL) {
                        if(percentageComplete == 'uploaded') {
                            button.disabled = false;
                            button.innerHTML = 'Uploaded. However YouTube is still processing.';
                            button.onclick = function() {
                                window.open(fileURL);
                            };
                            return;
                        }
                        if(percentageComplete == 'processed') {
                            button.disabled = false;
                            button.innerHTML = 'Uploaded & Processed. Click to open YouTube video.';
                            button.onclick = function() {
                                window.open(fileURL);
                            };

                            document.querySelector('h1').innerHTML = 'Your video has been uploaded. Default privacy type is <span>private</span>. Please visit <a href="https://www.youtube.com/my_videos?o=U" target="_blank">youtube.com/my_videos</a> to change to <span>public</span>.';
                            window.scrollTo(0, 0);
                            return;
                        }
                        if(percentageComplete == 'failed') {
                            button.disabled = false;
                            button.innerHTML = 'YouTube failed transcoding the video.';
                            button.onclick = function() {
                                window.open(fileURL);
                            };
                            return;
                        }
                        button.innerHTML = percentageComplete + '% uploaded to YouTube.';
                    });
                };
            }

            function uploadToPHPServer(fileName, recordRTC, callback) {
                var blob = recordRTC instanceof Blob ? recordRTC : recordRTC.getBlob();
                
                blob = new File([blob], 'RecordRTC-' + (new Date).toISOString().replace(/:|\./g, '-') + '.' + fileExtension, {
                    type: mimeType
                });

                // create FormData
                var formData = new FormData();
                formData.append('video-filename', fileName);
                formData.append('video-blob', blob);

                callback('Uploading recorded-file to server.');

                makeXMLHttpRequest('https://webrtcweb.com/RecordRTC/', formData, function(progress) {
                    if (progress !== 'upload-ended') {
                        callback(progress);
                        return;
                    }

                    var initialURL = 'https://webrtcweb.com/RecordRTC/uploads/';

                    callback('ended', initialURL + fileName);
                });
            }

            function makeXMLHttpRequest(url, data, callback) {
                var request = new XMLHttpRequest();
                request.onreadystatechange = function() {
                    if (request.readyState == 4 && request.status == 200) {
                        callback('upload-ended');
                    }
                };

                request.upload.onloadstart = function() {
                    callback('Upload started...');
                };

                request.upload.onprogress = function(event) {
                    callback('Upload Progress ' + Math.round(event.loaded / event.total * 100) + "%");
                };

                request.upload.onload = function() {
                    callback('progress-about-to-end');
                };

                request.upload.onload = function() {
                    callback('progress-ended');
                };

                request.upload.onerror = function(error) {
                    callback('Failed to upload to server');
                };

                request.upload.onabort = function(error) {
                    callback('Upload aborted.');
                };

                request.open('POST', url);
                request.send(data);
            }

            function SaveFileURLToDisk(fileUrl, fileName) {
                var hyperlink = document.createElement('a');
                hyperlink.href = fileUrl;
                hyperlink.target = '_blank';
                hyperlink.download = fileName || fileUrl;

                (document.body || document.documentElement).appendChild(hyperlink);
                hyperlink.onclick = function() {
                   (document.body || document.documentElement).removeChild(hyperlink);
                };

                var mouseEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });

                hyperlink.dispatchEvent(mouseEvent);
                
                // NEVER use "revoeObjectURL" here
                // you can use it inside "onclick" handler, though.
                // (window.URL || window.webkitURL).revokeObjectURL(hyperlink.href);

                // if you're writing cross-browser function:
                if(!navigator.mozGetUserMedia) { // i.e. if it is NOT Firefox
                   window.URL.revokeObjectURL(hyperlink.href);
                }
            }

            function getURL(arg) {
                var url = arg;

                if(arg instanceof Blob || arg instanceof File) {
                    url = URL.createObjectURL(arg);
                }

                if(arg instanceof RecordRTC || arg.getBlob) {
                    url = URL.createObjectURL(arg.getBlob());
                }

                if(arg instanceof MediaStream || arg.getTracks || arg.getVideoTracks) {
                    url = URL.createObjectURL(arg);
                }

                return url;
            }

            function setVideoURL(arg, forceNonImage) {
                var url = getURL(arg);

                var parentNode = recordingPlayer.parentNode;
                parentNode.removeChild(recordingPlayer);
                parentNode.innerHTML = '';

                var elem = 'video';
                if(type == 'gif' && !forceNonImage) {
                    elem = 'img';
                }
                if(type == 'audio') {
                    elem = 'audio';
                }

                recordingPlayer = document.createElement(elem);
                
                if(arg instanceof MediaStream) {
                    recordingPlayer.muted = true;
                }

                recordingPlayer.addEventListener('loadedmetadata', function() {
                    if(navigator.userAgent.toLowerCase().indexOf('android') == -1) return;

                    // android
                    setTimeout(function() {
                        if(typeof recordingPlayer.play === 'function') {
                            recordingPlayer.play();
                        }
                    }, 2000);
                }, false);

                recordingPlayer.poster = '';
                recordingPlayer.src = url;

                if(typeof recordingPlayer.play === 'function') {
                    recordingPlayer.play();
                }

                recordingPlayer.addEventListener('ended', function() {
                    url = getURL(arg);
                    recordingPlayer.src = url;
                });

                recordingPlayer.controls = true;
                parentNode.appendChild(recordingPlayer);
            }
       