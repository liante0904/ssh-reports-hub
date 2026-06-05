SHELL := /bin/bash
.DEFAULT_GOAL := help

NPM ?= npm
HOST ?= 127.0.0.1
PORT ?= 5173
PREVIEW_PORT ?= 4173
LOCAL_PORT ?= 8888
SSH_TARGET ?= oci
SSH_PORT ?= 22

.PHONY: help install local local-oci netlify netlify-oci dev build verify preview tunnel tunnel-oci2 test

help:
	@echo Targets:
	@echo '  make install   - install dependencies'
	@echo '  make local     - run vite dev on localhost'
	@echo '  make local-oci - run vite dev for SSH tunnel/browser access on OCI'
	@echo '  make netlify   - run netlify dev on localhost:8888'
	@echo '  make netlify-oci - run netlify dev for SSH tunnel/browser access on OCI'
	@echo '  make dev       - run vite dev on localhost'
	@echo '  make build     - build production bundle'
	@echo '  make verify    - run lint + build'
	@echo '  make preview   - run vite preview on localhost'
	@echo '  make tunnel    - open SSH tunnel to localhost:8888 via SSH_TARGET'
	@echo '  make tunnel-oci2 - open SSH tunnel to development OCI localhost:8888'

install:
	$(NPM) install

local:
	@echo "Open http://localhost:$(PORT)"
	@exec $(NPM) run dev -- --host "$(HOST)" --port "$(PORT)"

local-oci:
	@echo "Open through SSH tunnel: http://localhost:5174"
	@exec $(NPM) run dev -- --host "0.0.0.0" --port "5174"

netlify:
	@if command -v netlify >/dev/null 2>&1; then 		echo "Open http://localhost:$(LOCAL_PORT)"; 		exec netlify dev --no-open --port "$(LOCAL_PORT)"; 	elif [ -x "./node_modules/.bin/netlify" ]; then 		echo "Open http://localhost:$(LOCAL_PORT)"; 		exec ./node_modules/.bin/netlify dev --no-open --port "$(LOCAL_PORT)"; 	else 		echo "netlify CLI was not found. Run: npm install -D netlify-cli"; 		exit 1; 	fi

netlify-oci:
	@if command -v netlify >/dev/null 2>&1; then 		echo "Open through SSH tunnel: http://localhost:8888"; 		exec netlify dev --no-open --host 0.0.0.0 --port 8888; 	elif [ -x "./node_modules/.bin/netlify" ]; then 		echo "Open through SSH tunnel: http://localhost:8888"; 		exec ./node_modules/.bin/netlify dev --no-open --host 0.0.0.0 --port 8888; 	else 		echo "netlify CLI was not found. Run: npm install -D netlify-cli"; 		exit 1; 	fi

dev:
	$(NPM) run dev -- --host "$(HOST)" --port "$(PORT)"

build:
	$(NPM) run build

verify:
	$(NPM) run lint && $(NPM) run build

preview:
	$(NPM) run preview -- --host "$(HOST)" --port "$(PREVIEW_PORT)"

test:
	$(NPM) run test

tunnel:
	@echo "Forwarding http://localhost:$(LOCAL_PORT) using ssh $(SSH_TARGET)"
	@exec ssh -p "$(SSH_PORT)" -N -L "$(LOCAL_PORT):127.0.0.1:$(LOCAL_PORT)" "$(SSH_TARGET)"

tunnel-oci2:
	@echo "Forwarding http://localhost:8888 using ssh oci2"
	@exec ssh -N -L "8888:127.0.0.1:8888" "oci2"
