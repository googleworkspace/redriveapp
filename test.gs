// globals (needed for cleanup function)
file = null;
pdfFile = null;
txtFile = null;
mapFile = null;
copy = null;
destFolder = null;

// Before testing:
// (1) Temporarily change drive.file scope to drive scope in appscript.json manifest (see comments below for explanation)
// (2) Update the const variables below: existingGoogleDocId, shareWithAccount

function testReDriveApp() {

  // existingGoogleDocId: The drive.file scope only works if target files have first been opened 
  // by this script via the Drive Picker, which we don'to use here.
  // As a workaround, those testing ReDriveApp should temporarily switching to full /auth/drive 
  // scope in appscript.json for purposes of running this test.
  const existingGoogleDocId = '<Your Google Doc Id Here>'; // create a new Google Doc and place its ID here.

  // share with account - modify this if you are testing ReDriveApp.
  const shareWithAccount = 'someGoogleAccountYouOwn@SomeDomain.com';

  const fileName = 'Test ReDriveApp';
  const folderName = "ReDriveApp's Test Folder";
  const dataText = 'test test test';

  ReDriveApp.setApiVersion(2);

  try {
    ReDriveApp.getFileById(existingGoogleDocId);
  } catch (e) {
    // We're here because this code is being test with drive.file scope, which 
    // unfortunately is difficult to test w/o first selecting the existingGoogleDocId
    // file with the Drive File Picker. Ergo, ReDriveApp must be tested with the full
    // /auth/drive scope (until someone comes up with a better solution).
    console.log('Test aborted: Please temporarily modify the appscript.json file to use '
      + 'the full /auth/drive scope for testing purposes. Once tests pass, revert it to '
      + 'use /auth/drive.file');
      return;
  }

  var blob = Maps.newStaticMap().setCenter('76 9th Avenue, New York NY').getBlob();
  blob.setName('testBlob.png')
  mapFile = ReDriveApp.createFile(blob);
  
  mapFile = ReDriveApp.getFileById(mapFile.getId());
  if (mapFile.getName() !== 'testBlob.png') {
    console.log("ReDriveApp createFile error 1: file name: " + mapFile.getName());
    testCleanup();
    return;
  }

  var txtFile = ReDriveApp.createFile(fileName + ".txt", dataText, MimeType.PLAIN_TEXT);
  txtFile = ReDriveApp.getFileById(txtFile.getId());
  if (txtFile.getName() !== fileName + ".txt") {
    console.log("ReDriveApp createFile error 2: file name: " + txtFile.getName());
    testCleanup();
    return;
  }

  var pdfFile = ReDriveApp.createFile(fileName + ".pdf", dataText, MimeType.PDF);
  pdfFile = ReDriveApp.getFileById(pdfFile.getId());
  if (pdfFile.getName() !== fileName + ".pdf") {
    console.log("ReDriveApp createFile error 3: file name: " + pdfFile.getName());
    testCleanup();
    return;
  }

  var dt = new Date();
  var fileCreateTime = dt.getTime();
  if ((pdfFile.getDateCreated().getTime() - fileCreateTime) > 1000) {
    console.log("ReFile getDateCreated error");
    testCleanup();
    return;
  }
  
  // test createFolder and copy file
  file = ReDriveApp.getFileById(existingGoogleDocId);
  destFolder = ReDriveApp.createFolder(folderName);

  var matchingFolders = ReDriveApp.getFoldersByName(folderName);
  if (!matchingFolders.hasNext()) {
    console.log("Failed to find created folder");
    testCleanup();
    return;
  } else {
    destFolder = matchingFolders.next();
  }

  copy = file.makeCopy('new file name', destFolder);

  // test addViewer
  copy.addViewer(shareWithAccount);

  var pdfExportBlob = copy.getAs('application/pdf');
  pdfExportBlob.setName('newly exported.pdf')
  createfile = ReDriveApp.createFile(pdfExportBlob);
  file = ReDriveApp.getFileById(createfile.getId());

  if ((file.getName() !== 'newly exported.pdf')
    && (file.getContentType !== 'application/pdf')) {
    console.log("ReFile getAs error");
    testCleanup();
    return;
  }

  file.setName(fileName);
  var file = ReDriveApp.getFileById(file.getId());
  if (file.getName() !== fileName) {
    console.log("ReFile setName error");
    testCleanup();
    return;
  }

  file.setDescription(dataText)
  var file = ReDriveApp.getFileById(file.getId());
  if (file.getDescription() !== dataText) {
    console.log("ReFile setDescription error");
    testCleanup();
    return;
  }

  file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.NONE);
  // once have method to get sharing status, write test for above calls to setSharing() and addViewer()
  
  testCleanup();

  console.log("ReDriveApp: All tests passed");
}

function testCleanup() {
  if (pdfFile) {
    pdfFile.setTrashed(true);
  }

  if (txtFile) {
    txtFile.setTrashed(true);
  }

  if (mapFile) {
    mapFile.setTrashed(true);
  }

  if (createfile) {
    createfile.setTrashed(true);
  }

  if (copy) {
    copy.setTrashed(true);
  }

  if (file) {
    file.setTrashed(true);
  }

  if (destFolder) {
    destFolder.setTrashed(true);
  }  
}
