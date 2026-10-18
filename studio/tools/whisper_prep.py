#!/usr/bin/env python3
"""Copies of the on-device speech model for the online (artifact) copy of the studio.

The artifact page may not be allowed to reach Hugging Face or jsDelivr, so captions-asr.js falls back to files published
next to the page (only when window.STUDIO_MODEL_PARTS is set):
  vendor/transformers.min.js, vendor/ort-wasm-simd-threaded.jsep.mjs      transformers.js 3.8.1 and its ONNX runtime glue
  models/whisper/manifest.json                                            which files are split into which parts
  models/whisper/<name>.partN.txt                                         base64 pieces (≤ 15 MB of text each) of the
                                                                          runtime .wasm and the big .onnx files
  models/hf/onnx-community/whisper-base_timestamped/<small files>         configs and the tokenizer, as they are

  python3 studio/tools/whisper_prep.py <out dir>      (then publish everything under <out dir> with the artifact)
"""
import base64, json, os, subprocess, sys

TF = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/'
MODEL = 'onnx-community/whisper-base_timestamped'
HF = f'https://huggingface.co/{MODEL}/resolve/main/'
SMALL = ['config.json', 'generation_config.json', 'preprocessor_config.json', 'tokenizer.json', 'tokenizer_config.json']
# the dtypes captions-asr.js asks for: { encoder_model: 'fp16', decoder_model_merged: 'q8' }
BIG = ['onnx/encoder_model_fp16.onnx', 'onnx/decoder_model_merged_quantized.onnx']
PART = 15_000_000


def get(url, dest):
    if not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        subprocess.run(['curl', '-sSfL', '--retry', '4', '-o', dest, url], check=True)
    return dest


def main(out):
    raw = os.path.join(out, '.raw')
    get(TF + 'transformers.min.js', os.path.join(out, 'vendor', 'transformers.min.js'))
    # the artifact publisher refuses a literal U+FFFD: transformers only has it inside string literals, so escape it
    tfp = os.path.join(out, 'vendor', 'transformers.min.js')
    src = open(tfp, encoding='utf-8').read()
    if '\ufffd' in src:
        open(tfp, 'w', encoding='utf-8').write(src.replace('\ufffd', '\\uFFFD'))
    get(TF + 'ort-wasm-simd-threaded.jsep.mjs', os.path.join(out, 'vendor', 'ort-wasm-simd-threaded.jsep.mjs'))
    for f in SMALL:
        get(HF + f, os.path.join(out, 'models', 'hf', MODEL, f))
    manifest = {'model': MODEL, 'files': {}}
    pieces = [('wasm', get(TF + 'ort-wasm-simd-threaded.jsep.wasm', os.path.join(raw, 'ort.wasm')), 'ort-wasm')]
    for f in BIG:
        pieces.append((f, get(HF + f, os.path.join(raw, f.replace('/', '_'))), os.path.basename(f).replace('.onnx', '')))
    for key, path, stem in pieces:
        b = base64.b64encode(open(path, 'rb').read()).decode()
        n = (len(b) + PART - 1) // PART
        for i in range(n):
            with open(os.path.join(out, 'models', 'whisper', f'{stem}.part{i}.txt'), 'w') as fh:
                fh.write(b[i * PART:(i + 1) * PART])
        manifest['files'][key] = {'stem': stem, 'parts': n, 'bytes': os.path.getsize(path)}
        print(f'{key}: {n} parts')
    json.dump(manifest, open(os.path.join(out, 'models', 'whisper', 'manifest.json'), 'w'), indent=1)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    os.makedirs(os.path.join(sys.argv[1], 'models', 'whisper'), exist_ok=True)
    main(sys.argv[1])
