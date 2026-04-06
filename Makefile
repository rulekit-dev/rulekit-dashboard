.PHONY: install dev build typecheck test release

install:
	pnpm install --frozen-lockfile

dev:
	pnpm dev

build:
	pnpm build

typecheck:
	pnpm typecheck

test: typecheck build

# Usage: make release VERSION=1.2.0
release: test
	@test -n "$(VERSION)" || (echo "Usage: make release VERSION=1.2.0"; exit 1)
	git tag v$(VERSION)
	git push origin v$(VERSION)
