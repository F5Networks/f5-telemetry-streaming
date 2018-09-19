Summary: F5 Telemetry Services
Version: 1.0.0
Name: %{_name}
Release: %{_release}
BuildArch: noarch
Group: Development/Tools
License: Commercial
Packager: F5 Networks <support@f5.com>

%description
Telemetry Services declarative configuration method for BIG-IP

%define IAPP_INSTALL_DIR /var/config/rest/iapps/%{name}
%define PKGS_DIR /var/config/rest/iapps/%{name}/packages
%define _unpackaged_files_terminate_build 0

%prep
cp -r %{main}/src/dist/ %{_builddir}/src/
cp -r %{_topdir}/cloud-libs/ %{_builddir}/pkgs/
echo -n %{version}-%{release} > %{_builddir}/src/version

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
cp -r %{_builddir}/src/* $RPM_BUILD_ROOT%{IAPP_INSTALL_DIR}
mkdir -p $RPM_BUILD_ROOT%{PKGS_DIR}
cp -r %{_builddir}/pkgs/* $RPM_BUILD_ROOT%{PKGS_DIR}

%clean
rm -rf $RPM_BUILD_ROOT

%files
%defattr(-,root,root)
%{IAPP_INSTALL_DIR}
