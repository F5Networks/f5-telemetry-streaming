Summary: F5 Telemetry Streaming
Version: %{_version}
Name: %{_name}
Release: %{_release}
BuildArch: noarch
Group: Development/Tools
License: Commercial
Packager: F5 Networks <support@f5.com>

%description
Telemetry Streaming for BIG-IP

%define IAPP_INSTALL_DIR /var/config/rest/iapps/%{name}

%prep
cp -r %{main}/src/ %{_builddir}/src/
cp -r %{main}/opensource/ %{_builddir}/src/opensource
rm -r %{_builddir}/src/schema/[0-9]*
cp %{main}/package*.json %{_builddir}/src
npm ci --no-optional --only=prod --prefix %{_builddir}/src 
find %{_builddir}/src/opensource -maxdepth 1 -mindepth 1 -type d -exec basename {} \; | xargs -I{} echo %{_builddir}/src/node_modules/{} | xargs rm
mv %{_builddir}/src/opensource/* %{_builddir}/src/node_modules/.
rm -r %{_builddir}/src/opensource
echo -n %{version}-%{release} > %{_builddir}/src/version

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
cp -r %{_builddir}/src/* $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
$(cd $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}/schema; ln -s latest/*.json .)
mv $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}/nodejs/manifest.json $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
%{IAPP_INSTALL_DIR}
