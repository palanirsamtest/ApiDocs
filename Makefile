#
# This Makefile can be used on Windows, OSX, Linux machines
#
ifeq ($(shell echo "check_quotes"),"check_quotes")
   WINDOWS := yes
else
   WINDOWS := no
endif

ifeq ($(WINDOWS),yes)
	cp = xcopy $(subst /,\,$(1)) /s /e /h /y > nul 2>&1 || (exit 0)
	mkdir = mkdir $(subst /,\,$(1)) > nul 2>&1 || (exit 0)
	rm = $(wordlist 2,65535,$(foreach FILE,$(subst /,\,$(1)),& del $(FILE) > nul 2>&1)) || (exit 0)
	rmdir = rmdir /s /q $(subst /,\,$(1)) > nul 2>&1 || (exit 0)
	PWD := $(shell echo %cd%)
else
	cp = cp -R $(1)
	mkdir = mkdir -p $(1)
	rm = rm -f $(1) > /dev/null 2>&1 || true
	rmdir = rm -rf $(1) > /dev/null 2>&1 || true
endif

# Version is extracted from API specification version. The bash code may be subpar, but it does the job.
ifeq ($(WINDOWS),yes)
  VERSION := $(shell for /f "tokens=2" %%a in ('findstr "version: " .\apis\components\metadata.yml') do ( echo %%a ) )
else
  VERSION := $(shell grep 'version: ' apis/components/metadata.yml | sed 's/  version: //' )
endif

ifeq ($(WINDOWS),yes)
  PRIVATE_VERSION := $(shell for /f "tokens=2" %%a in ('findstr "version: " .\apis_private\private.yml') do ( echo %%a ) )
else
  PRIVATE_VERSION := $(shell grep 'version: ' apis_private/private.yml | sed 's/  version: //' )
endif

USER_AGENT_PREFIX := highbond-sdk

#
# Encapsulate script executions related to Node.js scripts via this function
# that boots up a Docker image to make the call.
# pass in two env variables used by prebundle.js
#
define node_docker
	docker run --env AWS_ACCOUNT=${AWS_ACCOUNT} --env SEMAPHORE_GIT_BRANCH=${SEMAPHORE_GIT_BRANCH} --rm -v ${PWD}:/local -t node:14-buster bin/sh -c "cd local && npm install && $(1)"
endef

#
# Generates desired language using OpenAPI-generator inside Docker.
#
define generate_sdk
	docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli:v4.0.0 generate \
		-i /local/dist/public/public.yml \
		-t /local/config/$(1)/templates \
		--http-user-agent $(USER_AGENT_PREFIX)-$(1)/$(VERSION) \
		--git-user-id acl-services --git-repo-id highbond-sdk-$(1) \
		-g $(2) \
		-c /local/config/$(1)/$(1).json \
		-o /local/sdks/highbond-sdk-$(1)
endef

#
# Generates desired language using OpenAPI-generator inside Docker using 5.3.0
#
define generate_sdk_v2
	docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli:$(5) generate \
		-i /local/dist/$(3)/$(3).yml \
		-t /local/config/$(1)/templates \
		--http-user-agent $(USER_AGENT_PREFIX)-$(1)/$(4) \
		--git-user-id acl-services --git-repo-id highbond-sdk-$(1) \
		-g $(2) \
		-c /local/config/$(1)/$(2).json \
		-o /local/sdks/highbond-sdk-$(1)
endef


#
# Generate _private_ SDK
#
define generate_private_sdk
	docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli:v4.3.1 generate \
		-i /local/dist/private/private.yml \
		-t /local/config/$(1)/templates \
		--http-user-agent $(USER_AGENT_PREFIX)-$(1)/$(PRIVATE_VERSION) \
		--git-user-id acl-services --git-repo-id highbond-sdk-$(1) \
		-g $(2) \
		-c /local/config/$(1)/$(1).json \
		-o /local/sdks/highbond-sdk-$(1) \
		--global-property modelTests=false
endef


#
# Generates desired language using OpenAPI-generator inside Docker.
#
define generate_sdk_private
	docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli:v4.0.0 generate \
		-i /local/dist/private/private.yml \
		-t /local/config/$(1)/templates \
		--http-user-agent $(USER_AGENT_PREFIX)-$(1)/$(VERSION) \
		--git-user-id acl-services --git-repo-id highbond-sdk-$(1) \
		-g $(1) \
		-c /local/config/$(1)/$(1).json \
		-o /local/sdks/highbond-sdk-$(1)
endef



dist:
	$(call mkdir,dist/public)
	$(call mkdir,dist/private)

cleanup:
	$(call rmdir,dist/)

#
# Combines multiple YAML file definition into a single YAML file.
# This is important for documentation distribution, and SDK generation.
#
bundle: cleanup dist
	$(call node_docker,npm run bundle)

#
# Uses Swagger CLI to validate the specification definition
#
validate: bundle
	$(call node_docker,npm run validate)

#
# Create documentations server for local access
#
docs_public:
	docker run --rm -v ${PWD}:/local -p 8085:8085 node:14-buster bin/sh -c "cd local && npm install && npm run public"
docs_private:
	docker run --rm -v ${PWD}:/local -p 8086:8086 node:14-buster bin/sh -c "cd local && npm install && npm run private"
# Deprecated - use the more specific `docs_public` or `docs_private` option
docs: docs_public

# Generate distributable version of docs
generate-docs: bundle
	$(call cp,apis/index.html dist/public/)
	$(call cp,apis/public.html dist/public/)
	$(call cp,apis/assets dist/public/)

	$(call cp,apis_private/index.html dist/private/)
	$(call cp,apis_private/assets dist/private/)

# Using Go's convenient output, we can clean-up all generated files before generating new ones,
# such that if we delete any API, it'll properly remove such generated code.
generate-go-sdk: bundle
	$(call rm,sdks/highbond-sdk-go/*.go)
	$(call generate_sdk,go,go)

# Validates that generated SDK is buildable
go-build:
	docker run --rm -v ${PWD}:/local -it golang:1.13-alpine sh -c "apk add git && cd /local/sdks/highbond-sdk-go && go build"

generate-go-v1: generate-go-sdk go-build

# Python generation is for potential use later on in AN / Robots. Not intended for public use (yet).
generate-python: bundle
	$(call generate_sdk,python,python)

generate-typescript-private: bundle
	$(call generate_sdk_v2,typescript-private,typescript-axios,private,$(PRIVATE_VERSION),v5.3.0)
generate-typescript: bundle
	$(call generate_sdk_v2,typescript,typescript-axios,public,$(VERSION),v5.3.0)

generate-ruby-private: bundle
	$(call generate_private_sdk,ruby-private,ruby)

generate: generate-docs generate-go generate-python
generate_private: generate-typescript-private generate-ruby-private


# Using Go's convenient output, we can clean-up all generated files before generating new ones,
# such that if we delete any API, it'll properly remove such generated code.
generate-go-sdk_v2: bundle
	$(call rm,sdks/highbond-sdk-go-v2/*.go)
	$(call generate_sdk_v2,go-v2,go,public,$(VERSION),v5.0.1)

# Validates that generated SDK is buildable
go-build_v2:
	docker run --rm -v ${PWD}:/local -it golang:1.13-alpine sh -c "apk add git && cd /local/sdks/highbond-sdk-go-v2 && go build"

generate-go-v2: generate-go-sdk_v2 go-build_v2

#
# Generate both versions until V1 is no longer required
#
generate-go: generate-go-v1 generate-go-v2


#
# Auto-correct styling mistakes in e.g. `yml` and `js` to ensure
# consistent styling. This is a convenient target to avoid needing to manually
# make the documentations adhere to styling
#
prettier:
	$(call node_docker,npm run prettier)

#
# If you can generate documentation, and generate SDKs, then the APIs must not be fataly broken.
# Also test compiling the generated Go SDK to catch yaml parsing problems
#
npmtest:
	$(call node_docker,npm run test)

test: npmtest validate generate generate_private

.PHONY: test prettier generate docs validate bundle cleanup dist go-build
