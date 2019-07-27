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
cp %{main}/package*.json %{_builddir}/src/nodejs
npm install --only=prod --prefix %{_builddir}/src/nodejs --no-optional
echo -n %{version}-%{release} > %{_builddir}/src/version

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
cp -r %{_builddir}/src/* $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
%{IAPP_INSTALL_DIR}
