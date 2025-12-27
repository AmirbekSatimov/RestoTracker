#!/usr/bin/env python3
import argparse
import sys

from faster_whisper import WhisperModel


def parse_args():
    parser = argparse.ArgumentParser(description="Transcribe audio with Faster Whisper.")
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("--model", default="base", help="Whisper model size")
    parser.add_argument("--device", default="cpu", help="Device: cpu or cuda")
    parser.add_argument("--compute-type", default="int8", help="Compute type")
    return parser.parse_args()


def main():
    args = parse_args()
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, _info = model.transcribe(args.audio_path)
    text_parts = []
    for segment in segments:
        if segment.text:
            text_parts.append(segment.text.strip())
    print(" ".join(text_parts))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Transcription failed: {exc}", file=sys.stderr)
        sys.exit(1)
