function supportsTextEncoderTransform(): boolean {
  return 'TextEncoderStream' in globalThis && !('EdgeRuntime' in globalThis)
}

class TextEncoderTransformer implements Transformer<string, Uint8Array> {
  #textEncoder: TextEncoder

  constructor(textEncoder: TextEncoder) {
    this.#textEncoder = textEncoder
  }

  transform(
    chunk: string,
    controller: TransformStreamDefaultController<Uint8Array>
  ): void {
    controller.enqueue(this.#textEncoder.encode(chunk))
  }
}

class PolyfillTextEncoderStream implements TransformStream<string, Uint8Array> {
  #textEncoder: TextEncoder
  #transformStream: TransformStream

  constructor() {
    this.#textEncoder = new TextEncoder()
    this.#transformStream = new TransformStream(
      new TextEncoderTransformer(this.#textEncoder)
    )
  }

  get encoding(): string {
    return this.#textEncoder.encoding
  }

  get readable(): ReadableStream<Uint8Array> {
    return this.#transformStream.readable
  }

  get writable(): WritableStream<string> {
    return this.#transformStream.writable
  }
}

export const TextEncoderStream = supportsTextEncoderTransform()
  ? globalThis.TextEncoderStream
  : PolyfillTextEncoderStream
