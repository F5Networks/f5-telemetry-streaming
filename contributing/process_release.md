# TS Release Process

## Release Artifacts

* Each TS release has multiple artifacts:
  * RPM
  * RPM sha256 checksum
* RPM is built in every pipeline run, and is kept in GitLab for one week
* On a Git tag, RPM is published to Artifactory (f5-telemetry-streaming-rpm)
* On a release, artifacts are copied from Artifactory to GitHub

## Release Notes

* Release notes, along with some examples, are tracked during development in the contributing directory as markdown
* When doing internal pre-releases, these markdown files are used when creating the release email
  * Web pages copy well into Outlook, so it is useful to convert the markdown to HTML using something like pandoc

## Release candidate process

* Check that all `feature` and `docs` branches targeted to the current release were merged to `develop` branch
* Choose the right commit in `develop` branch and create separate branch from it for release candidate with name "vX.Y.Z"
* Make sure RC branch has actual release version and build numbers in following files, do corrections if needed:
  * [package.json](package.json)
  * [package-lock.json](package-lock.json)
  * [project.spec](project.spec) (not required starting from 1.5)
  * [src/lib/constants.js](src/lib/constants.js) (not required starting from 1.10)
  * [src/schema/latest/base_schema.json](src/schema/latest/base_schema.json)
  * [contributing/README.md](contributing/README.md) (example of response, optional)
  * [docs/conf.py](docs/conf.py)
  * do simple `grep` in repository to ensure that no unexpected files with old version left
  * A new directory should be added for the new release version (same files that are in [src/schema/latest](src/schema/latest) go here)
  * There should be exact same files across following directories:
    * [src/schema/latest](src/schema/latest)
    * `src/schema/X.Y.Z` - where X.Y.Z is release version
* Update release version and build numbers in `develop` branch using list of the files above.
* Update [SUPPORT.md](SUPPORT.md) if not yet done (or at least check that everything looks valid):
  * add new version to the list of `Currently supported versions` with appropriate dates
  * remove no longer supported versions from `Currently supported versions` and add it to `Versions no longer supported`
* Push all changes to GitLab
* Get build artifacts (`.rpm` and `.sha256` checksum) from latest build and:
  * Check `.rpm` size, ideally it should not exceed 10 MB.:
    * 1.4.0 - 8.6 MB
    * 1.7.0 - 8.6 MB
    * 1.8.0 - 9.5 MB
  * Install build to BIG-IP, navigate to folder `/var/config/rest/iapps/f5-telemetry/` and check following:
    * Run `du -sh` and check that folder's size (shouldn't be much greater than previous versions):
      * 1.4.0 - 65 MB
      * 1.5.0 - 65 MB
      * 1.6.0 - 66 MB
      * 1.7.0 - 66 MB
      * 1.8.0 - 73 MB
    * Check `nodejs/node_modules` folder - if you see `eslint`, `mocha` or something else from [package.json](package.json) `devDependencies` section - something wrong with build process. Probably some `npm` flags are work as not expected and it MUST BE FIXED before publishing.
* Ensure that all tests (unit tests and functional tests passed)
* Create pre-release tag and push it to GitLab:
  * git tag -m 'Release candidate X.Y.Z-#' vX.Y.Z-#
  * git push origin
  * git push origin --tags
* Check pipeline for artifactory URL to package (or browse in artifactory)
* Create and send release candidate email with features, bugs, artifactory URL

## Release process

* Create new branch from `master`, e.g. `rc-master-branch`. It will be easier to merge branches and resolve conflicts without any following up issues.
* Merge RC branch into RC master branch - squash to avoid commits leaking sensitive url's, etc.
  * git checkout rc-master-branch
  * git merge --squash vX.Y.Z
  * git push origin
* Ideally it will be good to run functional and unit testing
* After that merge `rc-master-branch` to `master` branch:
  * git checkout master
  * git merge --squash rc-master-branch
  * git push origin
* Create tag in master branch:
  * git checkout master
  * git tag -m 'Release X.Y.Z' vX.Y.Z
  * git push origin --tags
* Push to GitHub master:
  * Create the GitHub remote (as needed):
    * git remote add github https://github.com/f5networks/f5-telemetry-streaming.git
  * git push github master
  * git push github --tags
* Merge GitLab master back into develop:
  * git checkout develop
  * git merge master
  * git push origin
  * Now you can remove RC branch
* Do not forget to clean up stale branches, e.g. RC branches
* Create GitHub release - [GitHub Releases](https://github.com/f5networks/f5-telemetry-streaming/releases)
  * Navigate to the latest release, select `edit` and upload artifacts:
    * `.rpm` file
    * `.sha256` file

# ATTENTION: DO NOT FORGET TO MERGE 'MASTER' BRANCH INTO 'DEVELOP' WHEN YOU ARE DONE WITH RELEASE PROCESS