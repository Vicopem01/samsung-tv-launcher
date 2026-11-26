set -eu
printf 'OURHOME_INSPECT_BEGIN\n'
/usr/bin/dotnet /home/owner/share/tmp/sdk_tools/OurHomeControl.dll apply /home/owner/share/tmp/sdk_tools/OurHomeOriginal.json
printf 'OURHOME_INSPECT_END\n'
