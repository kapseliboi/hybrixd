#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
export PATH=$WHEREAMI/../node/bin:"$PATH"
NODEINST=`which node`

echo "[i] Compiling all views..."
HERE="`pwd`";
cd "`cd $( dirname $BASH_SOURCE[0] ) && pwd`"
for D in *; do
    if [ "$D" != "files" ]; then
        if [ -d "${D}" ] && [ "${D}" != "node_modules" ] && [ "${D}" != "tests" ]; then
            echo "[.] Checking ${D}..."
            cd ${D}


            if uname | grep -q "Darwin"; then
                NEWEST_FILE="$(find . -type f -print0 | xargs -0 stat -f '%m %N' | sort -rn | head -1 | cut -f2- -d' ')";
            else
                NEWEST_FILE="$(find . -printf '%p\n' | sort -r | head -n1)";
            fi

            if [ "$D" = "index" ];then
                EXT="html"
            else
                EXT="json"
            fi

            if [ "$NEWEST_FILE" -nt "../${D}.${EXT}" ]; then
                echo "[.] Needs compiling.."
                node main.js
                echo "[.] Compiling completed"
            else
                echo "[.] Skip compiling"
            fi

            cd ..
        fi
    fi
done
cd "${HERE}"
echo "[.] All done."
PATH=$OLDPATH
