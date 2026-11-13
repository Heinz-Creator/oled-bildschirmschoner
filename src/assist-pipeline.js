const sampleRate = 16000;

function toPcm16(input, from) {
  const ratio = from / sampleRate;
  const n = Math.floor(input.length / ratio);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * ratio);
    const b = Math.max(a + 1, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let k = a; k < b && k < input.length; k++) sum += input[k];
    const v = Math.max(-1, Math.min(1, sum / (b - a)));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

export function beginAssistRun(hass, { text, pipeline, conversationId, microphone, endStage, onEvent, signal }) {
  const connection = hass.connection;
  return new Promise((resolve, reject) => {
    let handler;
    let unsubscribe;
    let settled = false;
    let processor;
    let source;
    let captureTimer;
    const hardTimeout = setTimeout(() => finish(new Error('Assist antwortet nicht.')), 45000);

    function endCapture() {
      clearTimeout(captureTimer);
      if (processor) {
        processor.onaudioprocess = null;
        source.disconnect();
        processor.disconnect();
        processor = null;
      }
      microphone?.stream.getTracks().forEach(track => track.stop());
    }

    function stopSending() {
      if (handler !== undefined && connection.socket?.readyState === 1) {
        connection.socket.send(Uint8Array.of(handler));
      }
      endCapture();
    }

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimeout);
      signal.removeEventListener('abort', cancel);
      endCapture();
      void unsubscribe?.().catch(() => {});
      if (error) reject(error);
      else resolve();
    }

    function cancel() {
      finish(new DOMException('Assist beendet', 'AbortError'));
    }

    function receive(event) {
      if (settled) return;
      if (event.type === 'run-start' && microphone) {
        handler = event.data?.runner_data?.stt_binary_handler_id;
        if (!Number.isInteger(handler) || !connection.socket) {
          finish(new Error('Die Mikrofonverbindung ist nicht verfügbar.'));
          return;
        }
        try {
          source = microphone.context.createMediaStreamSource(microphone.stream);
          processor = microphone.context.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = ({ inputBuffer }) => {
            if (connection.socket.readyState !== 1) return;
            const pcm = toPcm16(inputBuffer.getChannelData(0), microphone.context.sampleRate);
            const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
            const packet = new Uint8Array(bytes.length + 1);
            packet[0] = handler;
            packet.set(bytes, 1);
            connection.socket.send(packet);
          };
          source.connect(processor);
          processor.connect(microphone.context.destination);
          captureTimer = setTimeout(stopSending, 9000);
        } catch (error) {
          finish(error);
          return;
        }
      }
      if (event.type === 'stt-end' || event.type === 'stt-vad-end') endCapture();
      onEvent(event);
      if (event.type === 'error') finish(new Error(event.data?.message || 'Assist konnte die Anfrage nicht verarbeiten.'));
      if (event.type === 'run-end') finish();
    }

    if (signal.aborted) {
      cancel();
      return;
    }
    signal.addEventListener('abort', cancel, { once: true });
    const command = {
      type: 'assist_pipeline/run',
      start_stage: microphone ? 'stt' : 'intent',
      end_stage: endStage,
      input: microphone ? { sample_rate: sampleRate } : { text },
      ...(pipeline && { pipeline }),
      ...(conversationId && { conversation_id: conversationId }),
    };
    connection.subscribeMessage(receive, command, { resubscribe: false }).then(stop => {
      unsubscribe = stop;
      if (settled) void stop().catch(() => {});
    }).catch(finish);
  });
}
