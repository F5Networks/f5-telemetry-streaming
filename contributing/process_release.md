# TS Release Process

## Release Artifacts

* Each TS release has multiple artifacts:
  * RPM
  * RPM sha256 checksum
* RPM is built in every pipeline run, and is kept in GitLab for one week
* On a Git tag, RPM is published to Artifactory (f5-telemetry-streaming-rpm)
* The atg-build project pushes TS RPM builds to Artifactory (f5-automation-toolchain-generic/f5-telemetry)
* On a release, artifacts are copied from Artifactory to GitHub

## Release Notes

* Release notes, along with some examples, are tracked during development in the contributing directory as markdown
* When doing internal pre-releases, these markdown files are used when creating the release email
  * Web pages copy well into Outlook, so it is useful to convert the markdown to HTML using something like pandoc

## Release candidate process

* Check that all `feature` and `docs` branches targeted to the current release were merged to `develop` branch
* For first release candidate: Choose the right commit in `develop` branch and create separate branch from it for release candidate with name "vX.Y.Z". For subsequent release candidates: Merge the commit(s) from develop to the release branch.
* Make sure RC branch has actual release version and build numbers. **Note:** atg-build bumps the build number (e.g. to get first build vX.Y.Z-1, you must set package and package-lock to vX.Y.Z-0). Check the following files and do corrections if needed:
  * [package.json](package.json)
  * [package-lock.json](package-lock.json)
  * [src/schema/latest/base_schema.json](src/schema/latest/base_schema.json)
  * [contributing/README.md](contributing/README.md) (example of response, optional)
  * do simple `grep` in repository to ensure that no unexpected files with old version left
  * A new directory should be added for the new release version (same files that are in [src/schema/latest](src/schema/latest) go here)
  * There should be exact same files across following directories:
    * [src/schema/latest](src/schema/latest)
    * `src/schema/X.Y.Z` - where X.Y.Z is release version
* Update [SUPPORT.md](SUPPORT.md) if not yet done (or at least check that everything looks valid):
  * add new version to the list of `Currently supported versions` with appropriate dates
  * remove no longer supported versions from `Currently supported versions` and add it to `Versions no longer supported`
* Would be good to remove local `node_modules` directory and `package-lock.json` and do `npm run install-test`. Ideally `package-lock.json` will be the same as before. If not then it probably means that someone forgot to update it.
* Push all changes to GitLab
* Get build artifacts (`.rpm` and `.sha256` checksum) from latest build and:
  * Check `.rpm` size, ideally keep it small, and it should not change much from previous version:
    * 1.4.0 - 8.6 MB
    * 1.7.0 - 8.6 MB
    * 1.8.0 - 9.5 MB
    * 1.9.0 - 9.5 MB
    * 1.10.0 - 9.5 MB
    * 1.11.0 - 9.5 MB
    * 1.12.0 - 10.3 MB
    * 1.13.0 - 11 MB
    * 1.14.0 - 11.2 MB
    * 1.15.0 - 10.9 MB
    * 1.16.0 - 11.3 MB
    * 1.17.0 - 13.1 MB (NOTE: grpc module deps increase)
    * 1.18.0 - 13.3 MB
    * 1.19.0 - 14.1 MB
    * 1.20.0 - 14.4 MB
    * 1.21.0 - 15.5 MB
    * 1.22.0 - 15.6 MB
    * 1.23.0 - 17.8 MB (NOTE: inclusion of OpenTelemetry libraries)
    * 1.24.0 - 19.2 MB
    * 1.25.0 - 17.7 MB
    * 1.26.0 - 17.8 MB
    * 1.27.0 - 17.7 MB
    * 1.28.0 - 17.7 MB
    * 1.29.0 - 17.8 MB
    * 1.30.0 - 16.0 MB
    * 1.31.0 - 20.5 MB (NOTE: inclusion of OpenTelemetry and grpc-js libraries)
    * 1.32.0 - 20.5 MB
    * 1.33.0 - 22.1 MB
    * 1.34.0 - 18.4 MB
    * 1.35.0 - 18.4 MB
  * Install build to BIG-IP, navigate to folder `/var/config/rest/iapps/f5-telemetry/` and check following:
    * Run `du -sh` and check that folder's size (shouldn't be much greater than previous versions):
      * 1.4.0 - 65 MB
      * 1.5.0 - 65 MB
      * 1.6.0 - 66 MB
      * 1.7.0 - 66 MB
      * 1.8.0 - 73 MB
      * 1.9.0 - 73 MB
      * 1.10.0 - 76 MB
      * 1.11.0 - 75 MB
      * 1.12.0 - 80 MB
      * 1.13.0 - 81 MB
      * 1.14.0 - 82 MB
      * 1.15.0 - 79 MB
      * 1.16.0 - 82 MB
      * 1.17.0 - 95 MB (NOTE: grpc module deps increase)
      * 1.18.0 - 100 MB
      * 1.19.0 - 101 MB
      * 1.20.0 - 103 MB
      * 1.21.0 - 111 MB
      * 1.22.0 - 112 MB
      * 1.23.0 - 132 MB (NOTE: inclusion of OpenTelemetry libraries)
      * 1.24.0 - 134 MB
      * 1.25.0 - 130 MB
      * 1.26.0 - 127 MB
      * 1.27.0 - 127 MB
      * 1.28.0 - 127 MB
      * 1.29.0 - 129 MB
      * 1.30.0 - 116 MB
      * 1.31.0 - 153 MB (NOTE: inclusion of OpenTelemetry and grpc-js libraries)
      * 1.32.0 - 154 MB
      * 1.33.0 - 164 MB
      * 1.35.0 - 164 MB
    * Check `node_modules` folder - if you see `eslint`, `mocha` or something else from [package.json](package.json) `devDependencies` section - something wrong with build process. Probably some `npm` flags are work as not expected and it MUST BE FIXED before publishing.
* Ensure that all tests (unit tests and functional tests passed)
* Optional: Ensure that your local tags match remote. If not, remove all and re-fetch:
  * git tag -l -n
  * git tag | xargs -n1 git tag -d
  * git fetch --tags

**In the atg-build repository:**
* Update the `TS` CI Schedule, updating the `gitBranch` CI variable to point to the release candidate branch in the `TS` repo (ex: "vX.Y.Z")
* Run the `TS` schedule. The `TS` schedule will run a pipeline that will programmatically:
  * run unit tests in the `TS` repository
  * git tag the next version
  * update the git tags in the `TS` repository
  * push the new build artifacts to the 'f5-automation-toolchain-generic/f5-telemetry' Artifactory repository
  * send the release candidate email with features, bugs, artifactory URL

## LTS Release process (developers only)

Following list of changes should be done for both master/develop and LTS branches:

* Update [SUPPORT.md](SUPPORT.md) - set release type "LTS" and update support dates for LTS release
* Update [CHANGELOG.md](CHANGELOG.md) - add *Promoted to LTS* to **Changed** section
* Schema changes:
  * Create new folder for LTS version (with name X.Y.Z) in [src/schema](src/schema)
  * All schemas that are "newer" than LTS release should be updated to support LTS version. Update *base_schema.json* file only for each applicable version
  * **LTS branch only** - update [src/schema/latest](src/schema/latest) to match LTS schema

## Release process

* Create new branch from `master`, e.g. `rc-master-branch`. It will be easier to merge branches and resolve conflicts without any following up issues.
* Merge RC branch into RC master branch - squash to avoid leaking sensitive URLs, etc. through commits
  * git checkout rc-master-branch
  * git merge --squash vX.Y.Z
  * git push origin
* Would be good to remove local `node_modules` directory and `package-lock.json` and do `npm run install-test`. Ideally `package-lock.json` will be the same as before. If not then it probably means that someone forgot to update it.
* Ideally it will be good to run functional and unit testing
* After that merge `rc-master-branch` to `master` branch:
  * git checkout master
  * git merge --squash rc-master-branch
  * git commit -m 'merge vX.Y.Z into master branch'
  * git push origin
* Optional: Ensure that your local tags match remote. If not, remove all and re-fetch:
  * git tag -l -n
  * git tag | xargs -n1 git tag -d
  * git fetch --tags
* Check master history
  * commits should be squashed
  * check for any sensitive info in remaining commit messages
* Create tag in master branch:
  * git checkout master
  * git tag -m 'Release X.Y.Z' vX.Y.Z
  * git push origin tag vX.Y.Z
* Merge GitLab master back into develop:
  * git checkout develop
  * git merge master
  * git push origin
  * Now you can remove RC branch
* Remove all RC tags and branches and other stale branches that were used for release or RC process
* Setup `develop` branch for next TS Version
  * Update the version number to in the following files:
    * to X.Y.0-0
      * [package.json](package.json)
      * [package-lock.json](package-lock.json)
    * to X.Y.0
      * [src/schema/latest/base_schema.json](src/schema/latest/base_schema.json)
      * [contributing/README.md](contributing/README.md) (example of response, optional)
      * [docs/conf.py](docs/conf.py)
  * Add a new version section to [CHANGELOG.md](CHANGELOG.md)

### GitHub Publishing
* Push to GitHub master:
  * Create the GitHub remote (as needed):
    * git remote add github https://github.com/f5networks/f5-telemetry-streaming.git
  * git push github master
  * git push github tag vX.Y.Z
* Create GitHub release - [GitHub Releases](https://github.com/f5networks/f5-telemetry-streaming/releases)
  * Navigate to the latest release, select `edit` and upload artifacts:
    * `.rpm` file
    * `.sha256` file

# ATTENTION: DO NOT FORGET TO MERGE 'MASTER' BRANCH INTO 'DEVELOP' WHEN YOU ARE DONE WITH RELEASE PROCESS
