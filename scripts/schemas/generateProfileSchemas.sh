#!/bin/bash

source ./scripts/schemas/generateSchema.sh
IF="`pwd`/b2note-core/src/core/user.ts"
OD="`pwd`/b2note-core/src/core/schemas/"

T="UserProfilePartial"
generateSchema
