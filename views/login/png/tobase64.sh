#!/bin/sh
cat logo.png | base64 | tr -d '\n' > logo.base64

