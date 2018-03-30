#!/bin/sh
echo "FOR  *  REPLACING  $1  BY  $2"
find . -name "*" -exec sed -i "s/$1/$2/g" {} \;
