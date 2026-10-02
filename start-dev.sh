#!/usr/bin/env bash
set -e
(cd backend && npm install && npm run dev) &
(cd frontend && npm install && npm run dev) &
wait
