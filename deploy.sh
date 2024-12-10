#!/bin/sh
USER=jecortez
HOST=jimcortez.com
DIR=jimcortez.com/projects/cool-warm-contrast-shaders   # the directory where your web site files should go

npm run build \
  && rsync -avz -e "ssh -i ~/Personal/jecortez-personal.pem" dist/* ${USER}@${HOST}:~/${DIR}

exit 0
