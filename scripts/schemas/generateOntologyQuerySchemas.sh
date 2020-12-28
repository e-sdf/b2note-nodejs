#!/bin/bash

source ./scripts/schemas/generateSchema.sh
IF="`pwd`/b2note-core/src/core/apiModels/ontologyQueryModel.ts"
OD="`pwd`/app/schemas/"

T="OntologyGetQuery"
generateSchema

T="OntologyPatchQuery"
generateSchema