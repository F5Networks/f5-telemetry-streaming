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
rm -r %{_builddir}/src/schema/[0-9]*
cp %{main}/package*.json %{_builddir}/src
npm ci --no-optional --only=prod --prefix %{_builddir}/src 
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
