# TS Docs Release Process

Docs branches are:
- docs-staging
- docs-latest

`docs-latest` has the most recent version of publicly available documentation on **clouddocs**

`docs-staging` has the most recent version of privately available documentation on **GitLab Pages**. (for more info see [GitLab docs](https://docs.gitlab.com/ee/user/project/pages/))

Workflow is following:

If you are working on new feature or fix:
- create `feature` (any name allowed) branch off `develop`
- do docs changes along with the feature in the same feature branch.
- once the work done, create MR to merge `feature` branch to `develop`

If you need to update docs for not published release (aka 'in progress'):
- create `docs` (any name allowed) branch off `develop`
- do docs changes
- once the work done, create MR to merge `docs` branch to `develop`

If you need to update docs for the most recent publicly available release:
- create `docs` (any name allowed) branch off `docs-staging`
- do docs changes
- once the work done, create MR to merge `docs` branch to `docs-staging`
- review your changes once deployed to GitLab Pages
- if everything is OK then create MR to merge `docs-staging` to `docs-latest`
- merge and review your changes once deployed to the clouddocs
- merge `docs-latest` back to `develop`

If you need to update docs for the LST release:
- create `docs` (any name allowed) branch off `docs-X.Y.Z`, where X.Y.Z is the LTS release version
- do docs changes
- once the work done, create MR to merge `docs` branch to `docs-X.Y.Z-staging`
- review your changes once deployed to GitLab Pages
- if everything is OK then create MR to merge `docs-X.Y.Z-staging` to `docs-X.Y.Z-latest`
- merge and review your changes once deployed to the clouddocs

If you need to release docs from `develop` branch:
- merge `develop` to `docs-staging`
- review your changes once deployed to GitLab Pages
  - do not forget bump version number in `versions.json` and `docs/conf.py` files
- if everything is OK then create MR to merge `docs-staging` to `docs-latest`
- merge and review your changes once deployed to the clouddocs
- merge `docs-latest` back to `develop`

NOTE:

You can published docs to internal GitLab Page at any time to review your changes by kicking-off CI/CD pipeline and setting `FORCE_DOCS_STAGGING` env variable to `true`

